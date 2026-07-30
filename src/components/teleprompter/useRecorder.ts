import { useCallback, useEffect, useRef, useState } from "react";

export type Facing = "user" | "environment";
export type Orientation = "vertical" | "horizontal";

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=h264,aac",
    "video/mp4",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

/**
 * Muitos celulares entregam o vídeo sempre no sensor "deitado" (ex.: 1920x1080),
 * ignorando as constraints de orientação. Para garantir o arquivo final na
 * orientação escolhida, desenhamos os frames em um canvas com o tamanho alvo
 * (crop tipo "cover") e gravamos o canvas.
 */
async function buildOrientedStream(
  source: MediaStream,
  orientation: Orientation,
  zoomRef: { current: number },
) {
  const track = source.getVideoTracks()[0];
  if (!track) return { stream: source, stop: () => {} };

  const video = document.createElement("video");
  video.srcObject = new MediaStream([track]);
  video.muted = true;
  video.playsInline = true;
  await video.play().catch(() => {});
  await new Promise<void>((resolve) => {
    if (video.videoWidth) return resolve();
    video.onloadedmetadata = () => resolve();
    window.setTimeout(resolve, 1500);
  });

  const srcW = video.videoWidth || 1280;
  const srcH = video.videoHeight || 720;
  const portrait = orientation === "vertical";
  const long = Math.max(srcW, srcH);
  const short = Math.min(srcW, srcH);
  const outW = portrait ? short : long;
  const outH = portrait ? long : short;

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");

  let raf = 0;
  const draw = () => {
    if (ctx && video.videoWidth) {
      const z = Math.max(1, zoomRef.current || 1);
      const scale = Math.max(outW / video.videoWidth, outH / video.videoHeight) * z;
      const w = video.videoWidth * scale;
      const h = video.videoHeight * scale;
      ctx.drawImage(video, (outW - w) / 2, (outH - h) / 2, w, h);
    }
    raf = requestAnimationFrame(draw);
  };
  draw();

  const canvasStream = canvas.captureStream(30);
  source.getAudioTracks().forEach((t) => canvasStream.addTrack(t));

  return {
    stream: canvasStream,
    stop: () => {
      cancelAnimationFrame(raf);
      canvasStream.getVideoTracks().forEach((t) => t.stop());
      video.srcObject = null;
    },
  };
}

export function useRecorder() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultExt, setResultExt] = useState("webm");

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const orientationRef = useRef<Orientation>("vertical");
  const canvasStopRef = useRef<(() => void) | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const start = useCallback(
    async (facing: Facing, orientation: Orientation = "vertical") => {
      setError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Este navegador não permite acessar a câmera.");
        }
        stopStream();
        orientationRef.current = orientation;
        const portrait = orientation === "vertical";
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: portrait ? 1080 : 1920 },
            height: { ideal: portrait ? 1920 : 1080 },
            aspectRatio: { ideal: portrait ? 9 / 16 : 16 / 9 },
          },
          audio: true,
        });
        streamRef.current = s;
        setStream(s);
        return true;
      } catch (e) {
        const msg =
          e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError")
            ? "Permissão de câmera/microfone negada. Libere o acesso nas configurações do navegador."
            : e instanceof Error
              ? e.message
              : "Não foi possível abrir a câmera.";
        setError(msg);
        return false;
      }
    },
    [stopStream],
  );

  useEffect(() => {
    if (!recording) return;
    const startedAt = Date.now();
    setElapsed(0);
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    return () => window.clearInterval(id);
  }, [recording]);

  const startRecording = useCallback(async () => {
    const s = streamRef.current;
    if (!s) return;
    if (typeof MediaRecorder === "undefined") {
      setError("Este navegador não suporta gravação de vídeo.");
      return;
    }
    const mimeType = pickMimeType();
    try {
      const oriented = await buildOrientedStream(s, orientationRef.current, digitalZoomRef);
      canvasStopRef.current = oriented.stop;
      const rec = new MediaRecorder(oriented.stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const type = rec.mimeType || mimeType || "video/webm";
        canvasStopRef.current?.();
        canvasStopRef.current = null;
        const blob = new Blob(chunksRef.current, { type });
        setResultExt(type.includes("mp4") ? "mp4" : "webm");
        setResultUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      };
      recorderRef.current = rec;
      rec.start(1000);
      setRecording(true);

      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
        };
        wakeLockRef.current = (await nav.wakeLock?.request("screen")) ?? null;
      } catch {
        /* wake lock é opcional */
      }
    } catch {
      setError("Não foi possível iniciar a gravação neste navegador.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.state !== "inactive" && recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const clearResult = useCallback(() => {
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  return {
    stream,
    error,
    setError,
    recording,
    elapsed,
    resultUrl,
    resultExt,
    start,
    stopStream,
    startRecording,
    stopRecording,
    clearResult,
  };
}
