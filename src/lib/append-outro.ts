/**
 * Junta a gravação com o vídeo de fechamento (assinatura) num único MP4,
 * processado no próprio aparelho com ffmpeg.wasm.
 */

import { clearFFmpegLog, getFFmpeg, getFFmpegLog } from "@/lib/ffmpeg-client";
import outroAsset from "@/assets/outro-9x16.mp4.asset.json";

export const OUTRO_URL = outroAsset.url;

/** Limite de trabalho para não estourar memória no navegador/celular. */
const MAX_W = 1080;
const MAX_H = 1920;

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

export async function fetchOutro(): Promise<Uint8Array> {
  try {
    const res = await fetch(OUTRO_URL);
    if (!res.ok) {
      throw new MergeError(
        "Falha ao carregar o vídeo de fechamento.",
        `O servidor respondeu HTTP ${res.status}.`,
      );
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    // Evita arquivos placeholder/HTML servidos pelo dev server
    if (buf.byteLength < 1024) {
      throw new MergeError(
        "O vídeo de fechamento recebido é inválido.",
        `O arquivo tem somente ${buf.byteLength} bytes.`,
      );
    }
    return buf;
  } catch (error) {
    if (error instanceof MergeError) throw error;
    throw new MergeError(
      "Falha de rede ao carregar o vídeo de fechamento.",
      errorDetail(error),
    );
  }
}

function even(n: number) {
  return Math.max(2, Math.round(n) & ~1);
}

/** Reduz o alvo para caber no limite de trabalho, mantendo a proporção. */
function workSize(size: { width: number; height: number }) {
  const w = size.width || 1080;
  const h = size.height || 1920;
  const ratio = Math.min(1, MAX_W / w, MAX_H / h);
  return { w: even(w * ratio), h: even(h * ratio) };
}

/** Descobre se o arquivo tem faixa de áudio, lendo o log do ffmpeg. */
async function hasAudio(
  ffmpeg: Awaited<ReturnType<typeof getFFmpeg>>,
  name: string,
): Promise<boolean> {
  clearFFmpegLog();
  try {
    // Sem arquivo de saída o ffmpeg apenas imprime as informações dos streams.
    await ffmpeg.exec(["-hide_banner", "-i", name]);
  } catch {
    /* esperado: "At least one output file must be specified" */
  }
  return getFFmpegLog().some((line) => /Stream #\d+:\d+.*: Audio:/.test(line));
}

function lastError(): string {
  const log = getFFmpegLog();
  const err = [...log].reverse().find((l) => /error|invalid|failed|abort|memory/i.test(l));
  return (err ?? log[log.length - 1] ?? "erro desconhecido").slice(0, 300);
}

/** Normaliza um arquivo: resolução alvo, 30fps, H.264 + AAC estéreo 48kHz. */
async function normalize(
  ffmpeg: Awaited<ReturnType<typeof getFFmpeg>>,
  input: string,
  output: string,
  w: number,
  h: number,
) {
  const withAudio = await hasAudio(ffmpeg, input);
  const vf =
    `scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
    `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1`;

  // A gravação do navegador tem taxa de quadros variável e o áudio corre em
  // tempo real: sem forçar CFR e reamostrar o áudio, os dois desencontram.
  const args = ["-hide_banner", "-fflags", "+genpts"];
  if (withAudio) args.push("-async", "1");
  args.push("-i", input);
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
    "-fps_mode",
    "cfr",
    "-vsync",
    "cfr",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "23",
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


/**
 * Normaliza os dois vídeos para o mesmo formato e concatena.
 * Retorna um MP4 pronto para download.
 */
export async function appendOutro(
  recording: Blob,
  outro: Uint8Array,
  size: { width: number; height: number },
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  let ffmpeg: Awaited<ReturnType<typeof getFFmpeg>>;
  try {
    ffmpeg = await getFFmpeg();
  } catch (error) {
    throw new MergeError(
      "Falha ao iniciar o processador de vídeo.",
      errorDetail(error),
    );
  }
  const { w, h } = workSize(size);

  let stage = 0; // 0: gravação, 1: fechamento, 2: junção
  const handler = ({ progress }: { progress: number }) => {
    const p = Math.min(1, Math.max(0, progress));
    onProgress?.(Math.min(1, (stage + p) / 3));
  };
  ffmpeg.on("progress", handler);

  const recName = "rec-input";
  const outroName = "outro-input.mp4";
  const recNorm = "rec-norm.mp4";
  const outroNorm = "outro-norm.mp4";
  const listName = "concat-list.txt";
  const outputName = "final.mp4";

  const cleanup = async () => {
    for (const f of [recName, outroName, recNorm, outroNorm, listName, outputName]) {
      await ffmpeg.deleteFile(f).catch(() => {});
    }
  };

  try {
    try {
      await ffmpeg.writeFile(recName, new Uint8Array(await recording.arrayBuffer()));
      await ffmpeg.writeFile(outroName, outro);
    } catch (error) {
      throw new MergeError(
        "Falha ao copiar os vídeos para o processador.",
        errorDetail(error),
      );
    }

    try {
      stage = 0;
      await normalize(ffmpeg, recName, recNorm, w, h);
      await ffmpeg.deleteFile(recName).catch(() => {});
    } catch (error) {
      throw new MergeError("Falha ao converter a gravação antes da junção.", errorDetail(error));
    }

    try {
      stage = 1;
      await normalize(ffmpeg, outroName, outroNorm, w, h);
      await ffmpeg.deleteFile(outroName).catch(() => {});
    } catch (error) {
      throw new MergeError("Falha ao converter o vídeo de fechamento.", errorDetail(error));
    }

    try {
      stage = 2;
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
    } catch (error) {
      throw new MergeError("Falha na concatenação dos dois vídeos.", errorDetail(error));
    }

    let data: Uint8Array;
    try {
      data = (await ffmpeg.readFile(outputName)) as Uint8Array;
    } catch (error) {
      throw new MergeError("Falha ao ler o vídeo final processado.", errorDetail(error));
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
