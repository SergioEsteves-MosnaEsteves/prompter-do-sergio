import { useCallback, useEffect, useRef, useState } from "react";

export type Facing = "user" | "environment";
export type Orientation = "vertical" | "horizontal";
export type Fit = "cover" | "contain";
/** Categoria do erro, para a UI mostrar a ação certa. */
export type CameraErrorKind =
  | "iframe"
  | "denied"
  | "notfound"
  | "busy"
  | "unsupported"
  | "unknown";

const NO_RETRY_ERRORS = ["NotAllowedError", "SecurityError", "NotFoundError", "NotReadableError"];

function isInsideIframe() {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch {
    return true;
  }
}

function describeCameraError(e: unknown): { kind: CameraErrorKind; message: string } {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    if (isInsideIframe()) {
      return {
        kind: "iframe",
        message:
          "A câmera está bloqueada pela janela de prévia. Abra o app em uma aba separada para gravar.",
      };
    }
    return {
      kind: "denied",
      message:
        "Permissão de câmera/microfone negada. Libere o acesso nas configurações do navegador e recarregue a página.",
    };
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return {
      kind: "notfound",
      message: "Nenhuma câmera foi encontrada neste computador.",
    };
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return {
      kind: "busy",
      message:
        "A câmera está sendo usada por outro programa (Zoom, Teams, Meet...). Feche-o e tente de novo.",
    };
  }
  if (e instanceof Error && /não permite acessar a câmera/.test(e.message)) {
    return { kind: "unsupported", message: e.message };
  }
  return {
    kind: "unknown",
    message: e instanceof Error ? e.message : "Não foi possível abrir a câmera.",
  };
}

/** Quantas câmeras o dispositivo tem (para esconder o botão de trocar lente no desktop). */
async function countCameras() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput").length;
  } catch {
    return 0;
  }
}


function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/mp4;codecs=h264,aac",
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

/** Procura a lente mais aberta (ultra-wide) disponível para a direção pedida. */
async function findWidestDeviceId(facing: Facing, currentLabel?: string) {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cams = devices.filter((d) => d.kind === "videoinput");
    if (cams.length < 2) return undefined;
    const wanted = facing === "user" ? /front|frontal/i : /back|rear|tras/i;
    const side = cams.filter((d) => wanted.test(d.label));
    const pool = side.length ? side : cams;
    const ultra = pool.find((d) => /ultra|wide angle|grande angular|0\.5/i.test(d.label));
    if (ultra && ultra.label !== currentLabel) return ultra.deviceId;
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Muitos celulares entregam o vídeo sempre no sensor "deitado" (ex.: 1920x1080),
 * ignorando as constraints de orientação. Para garantir o arquivo final na
 * orientação escolhida, desenhamos os frames em um canvas com o tamanho alvo
 * e gravamos o canvas (recorte "cover" ou imagem inteira "contain").
 */
async function buildOrientedStream(
  source: MediaStream,
  orientation: Orientation,
  zoomRef: { current: number },
  fitRef: { current: Fit },
  mirrorRef: { current: boolean },
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
  // Proporção alvo fixa: não depende do sensor (webcams 4:3 dariam 3:4).
  const longSide = Math.min(1920, Math.max(srcW, srcH));
  const even = (n: number) => Math.max(2, Math.round(n) & ~1);
  const outW = portrait ? even((longSide * 9) / 16) : even(longSide);
  const outH = portrait ? even(longSide) : even((longSide * 9) / 16);


  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");

  let raf = 0;
  const draw = () => {
    if (ctx && video.videoWidth) {
      const fit = fitRef.current;
      const z = Math.max(1, zoomRef.current || 1);
      const base =
        fit === "contain"
          ? Math.min(outW / video.videoWidth, outH / video.videoHeight)
          : Math.max(outW / video.videoWidth, outH / video.videoHeight);
      const scale = base * z;
      const w = video.videoWidth * scale;
      const h = video.videoHeight * scale;
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, outW, outH);
      if (mirrorRef.current) {
        ctx.translate(outW, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, (outW - w) / 2, (outH - h) / 2, w, h);
      ctx.restore();
    }
    raf = requestAnimationFrame(draw);
  };
  draw();

  const canvasStream = canvas.captureStream(30);
  source.getAudioTracks().forEach((t) => canvasStream.addTrack(t));

  return {
    stream: canvasStream,
    aspect: outW / outH,
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
  const [errorKind, setErrorKind] = useState<CameraErrorKind | null>(null);
  const [cameraCount, setCameraCount] = useState(0);

  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultExt, setResultExt] = useState("webm");
  const [zoom, setZoomState] = useState(1);
  const [maxZoom, setMaxZoom] = useState(4);
  const [nativeZoom, setNativeZoom] = useState(false);
  const [fit, setFitState] = useState<Fit>("cover");
  const fitRef = useRef<Fit>("cover");

  const setFit = useCallback((value: Fit) => {
    fitRef.current = value;
    setFitState(value);
  }, []);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const outputRef = useRef<MediaStream | null>(null);
  const orientationRef = useRef<Orientation>("vertical");
  const canvasStopRef = useRef<(() => void) | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);
  const mirrorRef = useRef(false);
  const [aspect, setAspect] = useState(9 / 16);
  // fator de zoom digital aplicado no canvas (quando a câmera não tem zoom nativo)
  const digitalZoomRef = useRef(1);
  const nativeZoomRef = useRef(false);

  const setZoom = useCallback((value: number) => {
    setZoomState(value);
    const track = streamRef.current?.getVideoTracks()[0];
    if (nativeZoomRef.current && track) {
      digitalZoomRef.current = 1;
      track
        .applyConstraints({ advanced: [{ zoom: value }] } as unknown as MediaTrackConstraints)
        .catch(() => {});
    } else {
      digitalZoomRef.current = value;
    }
  }, []);

  const stopStream = useCallback(() => {
    canvasStopRef.current?.();
    canvasStopRef.current = null;
    outputRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);


  const start = useCallback(
    async (facing: Facing, orientation: Orientation = "vertical") => {
      setError(null);
      setErrorKind(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Este navegador não permite acessar a câmera.");
        }
        stopStream();
        orientationRef.current = orientation;
        // Não forçamos aspectRatio: pedir 9:16 faz o iPhone cortar as laterais
        // do sensor (parece "zoom"). O enquadramento é feito depois no canvas.
        // facingMode como preferência: no desktop não existe câmera traseira.
        const baseVideo: MediaTrackConstraints = {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        };
        let s: MediaStream;
        try {
          s = await navigator.mediaDevices.getUserMedia({ video: baseVideo, audio: true });
        } catch (first) {
          // Última tentativa sem nenhuma restrição de lente/resolução.
          if (first instanceof DOMException && NO_RETRY_ERRORS.includes(first.name)) throw first;
          s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        }

        // Depois da permissão os labels ficam visíveis: tenta trocar para a lente mais aberta.
        const currentLabel = s.getVideoTracks()[0]?.label;
        const wideId = await findWidestDeviceId(facing, currentLabel);
        if (wideId) {
          try {
            const wideStream = await navigator.mediaDevices.getUserMedia({
              video: { ...baseVideo, deviceId: { exact: wideId } },
              audio: true,
            });
            s.getTracks().forEach((t) => t.stop());
            s = wideStream;
          } catch {
            /* mantém o stream original */
          }
        }

        streamRef.current = s;
        mirrorRef.current = facing === "user";

        void countCameras().then(setCameraCount);

        const track = s.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as { zoom?: { min: number; max: number } };
        const hasNative = typeof caps.zoom?.max === "number" && caps.zoom.max > 1;
        nativeZoomRef.current = hasNative;
        setNativeZoom(hasNative);
        setMaxZoom(hasNative ? Math.min(caps.zoom!.max, 8) : 4);
        // Garante que a câmera abra no campo de visão mais amplo possível.
        if (hasNative) {
          const min = typeof caps.zoom?.min === "number" ? caps.zoom.min : 1;
          track
            ?.applyConstraints({ advanced: [{ zoom: min }] } as unknown as MediaTrackConstraints)
            .catch(() => {});
        }
        digitalZoomRef.current = 1;
        setZoomState(1);

        // A prévia usa exatamente o mesmo canvas que será gravado (1:1).
        const oriented = await buildOrientedStream(
          s,
          orientation,
          digitalZoomRef,
          fitRef,
          mirrorRef,
        );
        canvasStopRef.current = oriented.stop;
        outputRef.current = oriented.stream;
        if (oriented.aspect) setAspect(oriented.aspect);
        setStream(oriented.stream);
        return true;
      } catch (e) {
        const { kind, message } = describeCameraError(e);
        setErrorKind(kind);
        setError(message);
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
    const out = outputRef.current;
    if (!out) return;
    if (typeof MediaRecorder === "undefined") {
      setError("Este navegador não suporta gravação de vídeo.");
      return;
    }
    const mimeType = pickMimeType();
    try {
      // Grava exatamente o stream mostrado na prévia.
      const rec = new MediaRecorder(out, mimeType ? { mimeType } : undefined);
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

  useEffect(() => {
    void countCameras().then(setCameraCount);
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);


  return {
    stream,
    error,
    errorKind,
    cameraCount,
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
    zoom,
    setZoom,
    maxZoom,
    nativeZoom,
    fit,
    setFit,
    aspect,
  };

}
