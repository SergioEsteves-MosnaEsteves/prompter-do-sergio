/**
 * Junta a gravação com o vídeo de fechamento (assinatura) num único MP4,
 * processado no próprio aparelho com ffmpeg.wasm.
 *
 * Estratégia de velocidade:
 * - o fechamento já vem pré-processado no formato de trabalho (1080x1920 ou
 *   1920x1080, 30fps CFR, H.264 + AAC 48kHz), então nunca é recodificado;
 * - a gravação é apenas remuxada (`-c copy`) quando já sai em MP4/H.264 no
 *   mesmo tamanho; só cai na recodificação completa quando necessário;
 * - a presença de áudio vem do gravador, evitando passagens de inspeção.
 */

import { clearFFmpegLog, getFFmpeg, getFFmpegLog } from "@/lib/ffmpeg-client";
import outroPortraitAsset from "@/assets/outro-1080x1920.mp4.asset.json";
import outroLandscapeAsset from "@/assets/outro-1920x1080.mp4.asset.json";

export const OUTRO_URL = outroPortraitAsset.url;

export type WorkSize = { w: number; h: number };

/** Tamanho de trabalho: igual ao do fechamento pré-processado. */
export function targetSize(portrait: boolean): WorkSize {
  return portrait ? { w: 1080, h: 1920 } : { w: 1920, h: 1080 };
}

export class MergeError extends Error {
  constructor(
    message: string,
    readonly detail: string,
  ) {
    super(message);
    this.name = "MergeError";
  }
}

function errorDetail(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return lastError();
}

const outroCache = new Map<string, Promise<ArrayBuffer>>();

function outroUrl(portrait: boolean) {
  return portrait ? outroPortraitAsset.url : outroLandscapeAsset.url;
}

/** Limpa o cache do fechamento (usado quando o buffer é invalidado). */
export function clearOutroCache(portrait?: boolean) {
  if (portrait === undefined) outroCache.clear();
  else outroCache.delete(outroUrl(portrait));
}

/**
 * Baixa o fechamento já normalizado (com cache entre montagens).
 * Devolve sempre uma cópia nova: o processador de vídeo transfere (detach)
 * o buffer que recebe, o que invalidaria o cache.
 */
export async function fetchOutro(portrait = true): Promise<Uint8Array> {
  const url = outroUrl(portrait);
  let pending = outroCache.get(url);
  if (!pending) {
    pending = (async () => {
      const res = await fetch(url).catch((error: unknown) => {
        throw new MergeError(
          "Falha de rede ao carregar o vídeo de fechamento.",
          errorDetail(error),
        );
      });
      if (!res.ok) {
        throw new MergeError(
          "Falha ao carregar o vídeo de fechamento.",
          `O servidor respondeu HTTP ${res.status}.`,
        );
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 1024) {
        throw new MergeError(
          "O vídeo de fechamento recebido é inválido.",
          `O arquivo tem somente ${buf.byteLength} bytes.`,
        );
      }
      return buf;
    })().catch((err: unknown) => {
      outroCache.delete(url);
      throw err;
    });
    outroCache.set(url, pending);
  }
  const buffer = await pending;
  if (buffer.byteLength === 0) {
    // buffer foi transferido por algum caminho antigo: refaz o download
    outroCache.delete(url);
    return fetchOutro(portrait);
  }
  return new Uint8Array(buffer.slice(0));
}


function lastError(): string {
  const log = getFFmpegLog();
  const err = [...log].reverse().find((l) => /error|invalid|failed|abort|memory/i.test(l));
  return (err ?? log[log.length - 1] ?? "erro desconhecido").slice(0, 300);
}

/** Remux rápido: mantém os fluxos como estão, só arruma o container. */
async function remux(
  ffmpeg: Awaited<ReturnType<typeof getFFmpeg>>,
  input: string,
  output: string,
) {
  clearFFmpegLog();
  await ffmpeg.exec([
    "-hide_banner",
    "-fflags",
    "+genpts",
    "-i",
    input,
    "-c",
    "copy",
    "-video_track_timescale",
    "30000",
    "-avoid_negative_ts",
    "make_zero",
    "-movflags",
    "+faststart",
    output,
  ]);
}

/** Recodifica para o formato de trabalho: resolução alvo, 30fps CFR, H.264 + AAC. */
async function reencode(
  ffmpeg: Awaited<ReturnType<typeof getFFmpeg>>,
  input: string,
  output: string,
  w: number,
  h: number,
  withAudio: boolean,
) {
  const vf =
    `scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
    `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;

  const args = ["-hide_banner", "-fflags", "+genpts", "-i", input];
  if (!withAudio) {
    args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
  }
  args.push(
    "-vf",
    vf,
    "-map",
    "0:v:0",
    "-map",
    withAudio ? "0:a:0" : "1:a:0",
    ...(withAudio ? [] : ["-shortest"]),
    "-af",
    "aresample=async=1:min_hard_comp=0.100:first_pts=0",
    "-r",
    "30",
    "-vsync",
    "cfr",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-tune",
    "zerolatency",
    "-threads",
    "0",
    "-crf",
    "26",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-ar",
    "48000",
    "-ac",
    "2",
    "-b:a",
    "128k",
    "-video_track_timescale",
    "30000",
    "-avoid_negative_ts",
    "make_zero",
    output,
  );

  clearFFmpegLog();
  await ffmpeg.exec(args);
}

export type AppendOptions = {
  /** true quando a gravação já é MP4/H.264 no tamanho alvo (permite remux). */
  canCopy?: boolean;
  /** true quando a gravação tem faixa de áudio. */
  hasAudio?: boolean;
};

/**
 * Junta gravação + fechamento e devolve um MP4 pronto para salvar.
 */
export async function appendOutro(
  recording: Blob,
  outro: Uint8Array,
  size: WorkSize,
  onProgress?: (ratio: number) => void,
  options: AppendOptions = {},
): Promise<Blob> {
  const { canCopy = false, hasAudio = true } = options;
  let ffmpeg: Awaited<ReturnType<typeof getFFmpeg>>;
  try {
    ffmpeg = await getFFmpeg();
  } catch (error) {
    throw new MergeError("Falha ao iniciar o processador de vídeo.", errorDetail(error));
  }
  const { w, h } = size;

  // duas etapas: preparar a gravação e concatenar
  let stage = 0;
  const handler = ({ progress }: { progress: number }) => {
    const p = Math.min(1, Math.max(0, progress));
    onProgress?.(Math.min(1, (stage + p) / 2));
  };
  ffmpeg.on("progress", handler);

  const recName = "rec-input";
  const outroNorm = "outro-norm.mp4";
  const recNorm = "rec-norm.mp4";
  const listName = "concat-list.txt";
  const outputName = "final.mp4";

  const cleanup = async () => {
    for (const f of [recName, recNorm, listName, outputName]) {
      await ffmpeg.deleteFile(f).catch(() => {});
    }
  };

  try {
    const writeInputs = async (outroData: Uint8Array) => {
      // cópias novas: o worker transfere (detach) o buffer que recebe
      await ffmpeg.writeFile(recName, new Uint8Array(await recording.arrayBuffer()));
      await ffmpeg.writeFile(outroNorm, new Uint8Array(outroData.slice().buffer));
    };

    try {
      await writeInputs(outro);
    } catch (error) {
      const detail = errorDetail(error);
      if (/detach|clone/i.test(detail)) {
        // o fechamento em cache foi invalidado: baixa de novo e tenta uma vez
        try {
          clearOutroCache();
          const fresh = await fetchOutro(h >= w);
          await writeInputs(fresh);
        } catch (retryError) {
          throw new MergeError(
            "Falha ao copiar os vídeos para o processador.",
            errorDetail(retryError),
          );
        }
      } else {
        throw new MergeError("Falha ao copiar os vídeos para o processador.", detail);
      }
    }


    let copied = canCopy && hasAudio;
    try {
      stage = 0;
      if (copied) {
        try {
          await remux(ffmpeg, recName, recNorm);
        } catch {
          copied = false;
          await ffmpeg.deleteFile(recNorm).catch(() => {});
          await reencode(ffmpeg, recName, recNorm, w, h, hasAudio);
        }
      } else {
        await reencode(ffmpeg, recName, recNorm, w, h, hasAudio);
      }
      await ffmpeg.deleteFile(recName).catch(() => {});
    } catch (error) {
      throw new MergeError("Falha ao preparar a gravação antes da junção.", errorDetail(error));
    }

    const concat = async () => {
      await ffmpeg.writeFile(
        listName,
        new TextEncoder().encode(`file '${recNorm}'\nfile '${outroNorm}'\n`),
      );
      clearFFmpegLog();
      await ffmpeg.exec([
        "-hide_banner",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listName,
        "-c",
        "copy",
        "-movflags",
        "+faststart",
        outputName,
      ]);
    };

    let data: Uint8Array | null = null;
    try {
      stage = 1;
      await concat();
      data = (await ffmpeg.readFile(outputName)) as Uint8Array;
    } catch (error) {
      if (!copied) throw new MergeError("Falha na concatenação dos dois vídeos.", errorDetail(error));
      data = null;
    }

    // O remux rápido pode gerar parâmetros incompatíveis com a concatenação
    // direta; nesse caso refazemos a gravação recodificada e tentamos de novo.
    if ((!data || data.byteLength < 1024) && copied) {
      try {
        await ffmpeg.deleteFile(recNorm).catch(() => {});
        await ffmpeg.deleteFile(outputName).catch(() => {});
        await ffmpeg.writeFile(recName, new Uint8Array(await recording.arrayBuffer()));
        await reencode(ffmpeg, recName, recNorm, w, h, hasAudio);
        await concat();
        data = (await ffmpeg.readFile(outputName)) as Uint8Array;
      } catch (error) {
        throw new MergeError("Falha na concatenação dos dois vídeos.", errorDetail(error));
      }
    }

    if (!data || data.byteLength < 1024) {
      throw new MergeError("O arquivo final saiu vazio.", lastError());
    }
    onProgress?.(1);
    return new Blob([data.slice().buffer as ArrayBuffer], { type: "video/mp4" });
  } finally {
    ffmpeg.off("progress", handler);
    await cleanup();
  }
}

/** Lê a resolução real do vídeo gravado. */
export function getVideoSize(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const el = document.createElement("video");
    const done = (w: number, h: number) => {
      URL.revokeObjectURL(url);
      resolve({ width: w || 1080, height: h || 1920 });
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(el.videoWidth, el.videoHeight);
    el.onerror = () => done(1080, 1920);
    el.src = url;
  });
}
