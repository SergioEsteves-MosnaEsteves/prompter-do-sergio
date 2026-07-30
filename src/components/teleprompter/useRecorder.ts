import { useCallback, useEffect, useRef, useState } from "react";

export type Facing = "user" | "environment";

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
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const start = useCallback(
    async (facing: Facing) => {
      setError(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Este navegador não permite acessar a câmera.");
        }
        stopStream();
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1920 } },
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
      const rec = new MediaRecorder(s, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const type = rec.mimeType || mimeType || "video/webm";
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
