import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Download,
  RectangleHorizontal,
  RectangleVertical,
  RefreshCw,
  SwitchCamera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  TeleprompterOverlay,
  type PrompterSettings,
} from "@/components/teleprompter/TeleprompterOverlay";
import { RecorderControls } from "@/components/teleprompter/RecorderControls";
import {
  useRecorder,
  type Facing,
  type Orientation,
} from "@/components/teleprompter/useRecorder";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prompter — Grave vídeos com teleprompter no celular" },
      {
        name: "description",
        content:
          "Grave vídeos pela câmera do celular com um teleprompter rolando na tela. Controle velocidade, fonte e opacidade e baixe o vídeo direto no aparelho.",
      },
      { property: "og:title", content: "Prompter — Grave vídeos com teleprompter no celular" },
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

const DEFAULTS: PrompterSettings = { speed: 40, fontSize: 30, opacity: 0.45, height: 0.6 };

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const rec = useRecorder();


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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Prompter</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Grave olhando para a câmera
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Cole seu roteiro, ajuste a rolagem e grave. O vídeo fica salvo no seu celular.
          </p>
        </header>

        {rec.error && (
          <div className="mb-5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
            {rec.error}
          </div>
        )}

        <section className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="roteiro" className="text-sm font-medium text-foreground">
              Roteiro
            </label>
            <Textarea
              id="roteiro"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole aqui o texto que você vai ler..."
              className="min-h-56 resize-y text-base"
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

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={text.trim().length === 0}
            onClick={() => openCamera()}
          >
            <Camera className="mr-2 size-5" />
            Iniciar gravação
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
        <a
          href={rec.resultUrl}
          download={`gravacao-${Date.now()}.${rec.resultExt}`}
          className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary text-base font-semibold text-primary-foreground"
        >
          <Download className="mr-2 size-5" />
          Baixar vídeo
        </a>
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
            onChange={patch}
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
