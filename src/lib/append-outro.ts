/**
 * Junta a gravação com o vídeo de fechamento (assinatura) num único MP4,
 * processado no próprio aparelho com ffmpeg.wasm.
 */

import { getFFmpeg } from "@/lib/ffmpeg-client";
import outroAsset from "@/assets/outro-9x16.mp4.asset.json";

export const OUTRO_URL = outroAsset.url;

export async function fetchOutro(): Promise<Uint8Array | null> {
  try {
    const res = await fetch(OUTRO_URL);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    // Evita arquivos placeholder/HTML servidos pelo dev server
    if (buf.byteLength < 1024) return null;
    return buf;
  } catch {
    return null;
  }
}

/**
 * Normaliza os dois vídeos para o mesmo formato (resolução da gravação, 30fps,
 * H.264 + AAC) e concatena. Retorna um MP4 pronto para download.
 */
export async function appendOutro(
  recording: Blob,
  outro: Uint8Array,
  size: { width: number; height: number },
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  const handler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ffmpeg.on("progress", handler);

  const w = Math.max(2, size.width & ~1);
  const h = Math.max(2, size.height & ~1);
  const scalePad = (label: string, out: string) =>
    `[${label}]scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
    `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30[${out}]`;

  const inputName = "rec-input";
  const outroName = "outro-input.mp4";
  const outputName = "final.mp4";

  try {
    await ffmpeg.writeFile(inputName, new Uint8Array(await recording.arrayBuffer()));
    await ffmpeg.writeFile(outroName, outro);

    await ffmpeg.exec([
      "-i",
      inputName,
      "-i",
      outroName,
      "-f",
      "lavfi",
      "-t",
      "0.1",
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=48000",
      "-filter_complex",
      [
        scalePad("0:v", "v0"),
        scalePad("1:v", "v1"),
        "[0:a?][2:a]amix=inputs=2:duration=first:dropout_transition=0," +
          "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a0]",
        "[1:a?][2:a]amix=inputs=2:duration=first:dropout_transition=0," +
          "aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo[a1]",
        "[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]",
      ].join(";"),
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputName,
    ]);

    const data = (await ffmpeg.readFile(outputName)) as Uint8Array;
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outroName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
    return new Blob([data.slice().buffer as ArrayBuffer], { type: "video/mp4" });
  } finally {
    ffmpeg.off("progress", handler);
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
