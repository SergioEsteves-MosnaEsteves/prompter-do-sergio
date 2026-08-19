/**
 * Instância compartilhada do ffmpeg.wasm (roda no aparelho, nada vai para servidores).
 */

// A biblioteca @ffmpeg/ffmpeg usa um Web Worker do tipo module no Vite.
// O core UMD tenta usar importScripts() e falha nesse Worker; o build ESM é
// compatível com import() e funciona nos navegadores desktop modernos.
const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";

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
      try {
        await ffmpeg.load({
          coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`Falha ao carregar o processador de vídeo: ${detail}`);
      }
      return ffmpeg;
    })().catch((err) => {
      ffmpegPromise = null;
      throw err;
    });
  }
  return ffmpegPromise;
}
