import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  Download,
  ExternalLink,
  FileVideo,
  RectangleHorizontal,
  RectangleVertical,
  RefreshCw,
  Sparkles,
  SwitchCamera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { generateScriptFromUrl } from "@/lib/script.functions";
import {
  TeleprompterOverlay,
  type PrompterSettings,
} from "@/components/teleprompter/TeleprompterOverlay";
import { RecorderControls } from "@/components/teleprompter/RecorderControls";
import { clampSpeed, useSpeedShortcuts } from "@/components/teleprompter/useSpeedShortcuts";
import {
  useRecorder,
  type Facing,
  type Orientation,
} from "@/components/teleprompter/useRecorder";

const searchSchema = z.object({
  url: z
    .string()
    .refine((v) => /^https?:\/\//i.test(v), "URL inválida")
    .optional()
    .catch(undefined),
  duracao: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .pipe(z.enum(["30", "60", "90"]))
    .optional()
    .catch(undefined),
  plataforma: z.enum(["reels", "youtube"]).optional().catch(undefined),
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "PROMPTER DO SERGIO — Grave vídeos com teleprompter no celular" },
      {
        name: "description",
        content:
          "Grave vídeos pela câmera do celular com um teleprompter rolando na tela. Controle velocidade, fonte e opacidade e baixe o vídeo direto no aparelho.",
      },
      { property: "og:title", content: "PROMPTER DO SERGIO — Grave vídeos com teleprompter no celular" },
      {
        property: "og:description",
        content:
          "Grave vídeos pela câmera do celular com um teleprompter rolando na tela. Controle velocidade, fonte e opacidade e baixe o vídeo direto no aparelho.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const DEFAULTS: PrompterSettings = { speed: 35, fontSize: 30, opacity: 0.4, height: 0.35 };

type Stage = "setup" | "camera" | "preview";

function Index() {
  const [stage, setStage] = useState<Stage>("setup");
  const [text, setText] = useState("");
  const [facing, setFacing] = useState<Facing>("user");
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [settings, setSettings] = useState<PrompterSettings>(DEFAULTS);
  const [scrolling, setScrolling] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [opening, setOpening] = useState(false);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertError, setConvertError] = useState<string | null>(null);
  const search = Route.useSearch();
  const [url, setUrl] = useState(search.url ?? "");
  const [duration, setDuration] = useState<"30" | "60" | "90">(search.duracao ?? "60");
  const [platform, setPlatform] = useState<"reels" | "youtube">(search.plataforma ?? "reels");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const generate = useServerFn(generateScriptFromUrl);

  const videoRef = useRef<HTMLVideoElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const rec = useRecorder();

  const generateScript = useCallback(async () => {
    setGenError(null);
    setGenerating(true);
    try {
      const res = await generate({ data: { url: url.trim(), duration, platform } });
      setText(res.script);
    } catch (err) {
      setGenError(
        err instanceof Error && err.message
          ? err.message
          : "Não foi possível gerar o roteiro. Tente outro link.",
      );
    } finally {
      setGenerating(false);
    }
  }, [generate, url, duration, platform]);

  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current) return;
    if (!search.url) return;
    autoRan.current = true;
    void generateScript();
  }, [search.url, generateScript]);



  const convertVideo = useCallback(async () => {
    if (!rec.resultBlob) return;
    setConverting(true);
    setConvertError(null);
    setProgress(0);
    try {
      const { convertToMp4 } = await import("@/lib/convert-to-mp4");
      const mp4 = await convertToMp4(rec.resultBlob, setProgress);
      rec.replaceResult(mp4);
    } catch {
      setConvertError("Não foi possível converter. Tente um vídeo mais curto.");
    } finally {
      setConverting(false);
    }
  }, [rec]);



  useEffect(() => {
    if (videoRef.current && rec.stream) {
      videoRef.current.srcObject = rec.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [rec.stream, stage]);

  useEffect(() => {
    if (rec.resultUrl) setStage("preview");
  }, [rec.resultUrl]);

  const patch = useCallback(
    (p: Partial<PrompterSettings>) => setSettings((s) => ({ ...s, ...p })),
    [],
  );

  const [speedHint, setSpeedHint] = useState<number | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSpeedHint = useCallback((value: number) => {
    setSpeedHint(value);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setSpeedHint(null), 1000);
  }, []);

  const adjustSpeed = useCallback(
    (delta: number) => {
      setSettings((s) => {
        const speed = clampSpeed(s.speed + delta);
        showSpeedHint(speed);
        return { ...s, speed };
      });
    },
    [showSpeedHint],
  );

  useSpeedShortcuts(stage === "camera", adjustSpeed);

  const patchWithHint = useCallback(
    (p: Partial<PrompterSettings>) => {
      if (typeof p.speed === "number") showSpeedHint(p.speed);
      patch(p);
    },
    [patch, showSpeedHint],
  );


  const openCamera = async (f: Facing = facing) => {
    setOpening(true);
    const ok = await rec.start(f, orientation);
    setOpening(false);
    if (ok) {
      setStage("camera");
      setScrolling(false);
      setResetKey((k) => k + 1);
    } else {
      requestAnimationFrame(() =>
        errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    }
  };


  const flipCamera = async () => {
    const next: Facing = facing === "user" ? "environment" : "user";
    setFacing(next);
    await rec.start(next, orientation);
  };

  const toggleRecord = () => {
    if (rec.recording) {
      rec.stopRecording();
      setScrolling(false);
    } else {
      setResetKey((k) => k + 1);
      rec.startRecording();
      setScrolling(true);
    }
  };

  const exitCamera = () => {
    if (rec.recording) rec.stopRecording();
    rec.stopStream();
    setStage("setup");
  };

  if (stage === "setup") {
    return (
      <main className="mx-auto min-h-screen w-full max-w-lg px-5 pb-14 pt-10">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">PROMPTER DO SERGIO</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Grave olhando para a câmera
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cole seu roteiro, ajuste a rolagem e grave. O vídeo fica salvo no seu celular.
          </p>
        </header>

        <section className="space-y-6">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium text-foreground">
                Link do artigo <span className="text-muted-foreground">(opcional)</span>
              </label>
              <Input
                id="url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://site.com/materia"
              />
              <p className="text-xs text-muted-foreground">
                Geramos um roteiro em linguagem de manchete a partir da matéria.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Duração</span>
                <div className="grid grid-cols-3 gap-1">
                  {(["30", "60", "90"] as const).map((d) => (
                    <Button
                      key={d}
                      type="button"
                      size="sm"
                      variant={duration === d ? "default" : "secondary"}
                      onClick={() => setDuration(d)}
                    >
                      {d}s
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Plataforma</span>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={platform === "reels" ? "default" : "secondary"}
                    onClick={() => setPlatform("reels")}
                  >
                    Reels
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={platform === "youtube" ? "default" : "secondary"}
                    onClick={() => setPlatform("youtube")}
                  >
                    YouTube
                  </Button>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={url.trim().length === 0 || generating}
              onClick={generateScript}
            >
              <Sparkles className="mr-2 size-4" />
              {generating ? "Gerando roteiro..." : "Gerar roteiro"}
            </Button>

            {genError && <p className="text-sm text-destructive">{genError}</p>}
          </div>

          <div className="space-y-2">

            <label htmlFor="roteiro" className="text-sm font-medium text-foreground">
              Roteiro
            </label>
            <Textarea
              id="roteiro"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole aqui o texto que você vai ler..."
              className="max-h-96 min-h-56 resize-y overflow-y-auto text-base"
            />
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <Row label="Velocidade" value={`${settings.speed} px/s`}>
              <Slider
                value={[settings.speed]}
                min={10}
                max={200}
                step={5}
                onValueChange={([v]) => patch({ speed: v })}
              />
            </Row>
            <Row label="Tamanho da fonte" value={`${settings.fontSize} px`}>
              <Slider
                value={[settings.fontSize]}
                min={16}
                max={72}
                step={2}
                onValueChange={([v]) => patch({ fontSize: v })}
              />
            </Row>
            <Row label="Opacidade da faixa" value={`${Math.round(settings.opacity * 100)}%`}>
              <Slider
                value={[settings.opacity]}
                min={0}
                max={0.9}
                step={0.05}
                onValueChange={([v]) => patch({ opacity: v })}
              />
            </Row>
            <Row label="Altura da faixa" value={`${Math.round(settings.height * 100)}%`}>
              <Slider
                value={[settings.height]}
                min={0.25}
                max={0.95}
                step={0.05}
                onValueChange={([v]) => patch({ height: v })}
              />
            </Row>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Formato do vídeo</span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={orientation === "vertical" ? "default" : "secondary"}
                onClick={() => setOrientation("vertical")}
              >
                <RectangleVertical className="mr-2 size-4" />
                Vertical 9:16
              </Button>
              <Button
                type="button"
                variant={orientation === "horizontal" ? "default" : "secondary"}
                onClick={() => setOrientation("horizontal")}
              >
                <RectangleHorizontal className="mr-2 size-4" />
                Horizontal 16:9
              </Button>
            </div>
            {orientation === "horizontal" && (
              <p className="text-xs text-muted-foreground">
                Gire o celular para o lado ao gravar na horizontal.
              </p>
            )}
          </div>

          {rec.cameraCount !== 1 && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setFacing(facing === "user" ? "environment" : "user")}
              >
                <SwitchCamera className="mr-2 size-4" />
                {facing === "user" ? "Frontal" : "Traseira"}
              </Button>
            </div>
          )}

          {rec.error && (
            <div
              ref={errorRef}
              className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground"
            >
              <p>{rec.error}</p>
              {rec.errorKind === "iframe" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(window.location.href, "_blank", "noopener")}
                >
                  <ExternalLink className="mr-2 size-4" />
                  Abrir em nova aba
                </Button>
              )}
            </div>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={text.trim().length === 0 || opening}
            onClick={() => openCamera()}
          >
            <Camera className="mr-2 size-5" />
            {opening ? "Abrindo câmera..." : "Iniciar gravação"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            O teleprompter aparece só na sua tela — ele não fica gravado no vídeo.
          </p>
        </section>
      </main>
    );
  }

  if (stage === "preview" && rec.resultUrl) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col gap-5 px-5 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Sua gravação</h1>
        <video
          src={rec.resultUrl}
          controls
          playsInline
          className="w-full rounded-xl border border-border bg-black"
        />

        {rec.resultExt !== "mp4" && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-3 text-sm">
            <p className="text-muted-foreground">
              Este navegador gravou em WebM, formato que a galeria do celular não aceita.
              Converta para MP4 antes de salvar.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={converting}
              onClick={convertVideo}
            >
              <FileVideo className="mr-2 size-4" />
              {converting
                ? `Convertendo... ${Math.round(progress * 100)}%`
                : "Converter para MP4"}
            </Button>
            {convertError && <p className="text-destructive">{convertError}</p>}
          </div>
        )}

        <a
          href={rec.resultUrl}
          download={`gravacao-${Date.now()}.${rec.resultExt}`}
          className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground"
        >
          <Download className="mr-2 size-5" />
          Baixar vídeo {rec.resultExt === "mp4" ? "(MP4)" : "(WebM)"}
        </a>
        <p className="text-center text-xs text-muted-foreground">
          No iPhone: toque em Baixar e depois em Salvar em Vídeos.
        </p>

        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => {
            rec.clearResult();
            openCamera();
          }}
        >
          <RefreshCw className="mr-2 size-4" />
          Regravar
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            rec.clearResult();
            rec.stopStream();
            setStage("setup");
          }}
        >
          Voltar ao roteiro
        </Button>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black">
      <div
        className="relative max-h-full max-w-full overflow-hidden"
        style={{
          aspectRatio: `${rec.aspect}`,
          height: orientation === "vertical" ? "100%" : undefined,
          width: orientation === "vertical" ? undefined : "100%",
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          onClick={() => setChromeVisible((v) => !v)}
          className="size-full object-contain"
        />



        <TeleprompterOverlay
          text={text}
          settings={settings}
          scrolling={scrolling}
          resetKey={resetKey}
        />
      </div>

      {speedHint !== null && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background/80 px-5 py-3 text-center">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Velocidade</div>
          <div className="text-2xl font-bold tabular-nums text-foreground">{speedHint}</div>
        </div>
      )}

      {chromeVisible && (
        <>
          <button
            type="button"
            onClick={flipCamera}
            aria-label="Trocar câmera"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-background/70 text-foreground"
          >
            <SwitchCamera className="size-5" />
          </button>
          <RecorderControls
            settings={settings}
            onChange={patchWithHint}

            scrolling={scrolling}
            onToggleScroll={() => setScrolling((s) => !s)}
            onRestart={() => setResetKey((k) => k + 1)}
            recording={rec.recording}
            elapsed={rec.elapsed}
            onToggleRecord={toggleRecord}
            onExit={exitCamera}
            zoom={rec.zoom}
            maxZoom={rec.maxZoom}
            onZoomChange={rec.setZoom}
            fit={rec.fit}
            onFitChange={rec.setFit}
          />

        </>
      )}
    </main>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{value}</span>
      </div>
      {children}
    </div>
  );
}
