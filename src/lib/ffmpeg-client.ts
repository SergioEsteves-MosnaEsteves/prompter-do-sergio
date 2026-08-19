/**
 * Instância compartilhada do ffmpeg.wasm (roda no aparelho, nada vai para servidores).
 */

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

export type FFmpegInstance = import("@ffmpeg/ffmpeg").FFmpeg;

let ffmpegPromise: Promise<FFmpegInstance> | null = null;

/** Últimas linhas de log do ffmpeg, para diagnosticar falhas. */
const logBuffer: string[] = [];

export function getFFmpegLog(): string[] {
  return [...logBuffer];
}

export function clearFFmpegLog() {
  logBuffer.length = 0;
}

export async function getFFmpeg(): Promise<FFmpegInstance> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const ffmpeg = new FFmpeg();
      ffmpeg.on("log", ({ message }) => {
        logBuffer.push(message);
        if (logBuffer.length > 400) logBuffer.shift();
      });
      await ffmpeg.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ffmpeg;
    })().catch((err) => {
      ffmpegPromise = null;
      throw err;
    });
  }
  return ffmpegPromise;
}
