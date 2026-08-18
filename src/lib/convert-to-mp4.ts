/**
 * Converte um vídeo gravado (WebM) para MP4 H.264/AAC diretamente no aparelho,
 * usando ffmpeg compilado em WebAssembly. Nada é enviado para servidores.
 */

import { getFFmpeg } from "@/lib/ffmpeg-client";


export async function convertToMp4(
  input: Blob,
  onProgress?: (ratio: number) => void,
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();
  const handler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(1, Math.max(0, progress)));
  };
  ffmpeg.on("progress", handler);
  try {
    const inputName = "input.webm";
    const outputName = "output.mp4";
    await ffmpeg.writeFile(inputName, new Uint8Array(await input.arrayBuffer()));
    await ffmpeg.exec([
      "-i",
      inputName,
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
    await ffmpeg.deleteFile(outputName).catch(() => {});
    return new Blob([data.slice().buffer as ArrayBuffer], { type: "video/mp4" });
  } finally {
    ffmpeg.off("progress", handler);
  }
}
