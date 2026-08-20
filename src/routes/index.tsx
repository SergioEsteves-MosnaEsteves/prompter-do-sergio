import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  Circle,
  Download,
  ExternalLink,
  Eye,
  KeyRound,
  Loader2,
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
import { Checkbox } from "@/components/ui/checkbox";
import { SiteHeader, SiteFooter } from "@/components/portas/SiteChrome";
import { PortasKey } from "@/components/portas/PortasBrand";

import { generateScriptFromUrl } from "@/lib/script.functions";
import {
  TeleprompterOverlay,
  type PrompterSettings,
} from "@/components/teleprompter/TeleprompterOverlay";
import { RecorderControls, RecorderTopBar } from "@/components/teleprompter/RecorderControls";
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
      { title: "Portas Prompter — Grave vídeos com teleprompter no celular" },
      {
        name: "description",
        content:
          "Grave vídeos comentando as notícias do mercado imobiliário com um teleprompter na tela do celular. Roteiro gerado a partir das matérias do Portas. Baixe o vídeo direto no aparelho.",
      },
      { property: "og:title", content: "Portas Prompter — Grave vídeos com teleprompter no celular" },
      {
        property: "og:description",
        content:
          "Grave vídeos comentando as notícias do mercado imobiliário com um teleprompter na tela do celular. Roteiro gerado a partir das matérias do Portas. Baixe o vídeo direto no aparelho.",
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
  const [merging, setMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [withOutro, setWithOutro] = useState(false);
  const [readyFile, setReadyFile] = useState<File | null>(null);
  const outroDone = useRef(false);


  const search = Route.useSearch();
  const [url, setUrl] = useState(search.url ?? "");
  const [duration, setDuration] = useState<"30" | "60" | "90">(search.duracao ?? "30");
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




  const triggerDownload = useCallback((blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gravacao-${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }, []);

  // iOS só mostra "Salvar vídeo" (Fotos) se navigator.share for chamado
  // DENTRO do gesto do usuário. Por isso o arquivo é preparado antes,
  // num primeiro toque, e compartilhado sem await no segundo.
  const prepareFile = useCallback(async () => {
    if (!rec.resultBlob) return;
    setMergeError(null);
    let blob = rec.resultBlob;

    try {
      if (rec.resultExt !== "mp4") {
        setConverting(true);
        setProgress(0);
        const { convertToMp4 } = await import("@/lib/convert-to-mp4");
        blob = await convertToMp4(blob, setProgress);
        rec.replaceResult(blob);
        setConverting(false);
      }
    } catch {
      setConverting(false);
      setConvertError("Não foi possível converter para MP4. Tente um vídeo mais curto.");
      setReadyFile(new File([blob], `gravacao-${Date.now()}.${rec.resultExt}`, { type: blob.type }));
      return;
    }

    if (withOutro && !outroDone.current) {
      setMerging(true);
      setMergeProgress(0);
      try {
        const { appendOutro, fetchOutro, getVideoSize, targetSize } = await import(
          "@/lib/append-outro"
        );
        const portrait = rec.resultPortrait;
        const size = targetSize(portrait);
        const [outro, real] = await Promise.all([fetchOutro(portrait), getVideoSize(blob)]);
        const canCopy =
          rec.resultExt === "mp4" && real.width === size.w && real.height === size.h;
        blob = await appendOutro(blob, outro, size, setMergeProgress, {
          canCopy,
          hasAudio: rec.hadAudio,
        });
        outroDone.current = true;
        rec.replaceResult(blob);
      } catch (err) {
        console.error("[outro] falha na junção:", err);
        const detail =
          err && typeof err === "object" && "detail" in err
            ? String((err as { detail: unknown }).detail)
            : err instanceof Error
              ? err.message
              : typeof err === "string"
                ? err
                : "erro não identificado";
        const base =
          err instanceof Error && err.name === "MergeError"
            ? err.message
            : "Não foi possível juntar o vídeo de fechamento.";
        const hint = /memory|abort|alloc|out of bounds/i.test(detail)
          ? " Motivo: memória insuficiente no navegador para processar este vídeo."
          : detail
            ? ` Motivo técnico: ${detail}`
            : "";
        setMergeError(`${base}${hint} Salvando só a gravação.`);
      } finally {
        setMerging(false);
      }
    }

    setReadyFile(
      new File([blob], `gravacao-${Date.now()}.mp4`, { type: blob.type || "video/mp4" }),
    );
  }, [rec, withOutro]);


  const saveReadyFile = useCallback(() => {
    const file = readyFile;
    if (!file) return;
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files: [file] })) {
      // sem await antes: mantém o gesto do usuário válido no iOS
      nav
        .share({ files: [file] })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setMergeError(
            "O sistema não abriu a folha de compartilhamento. Baixando o arquivo.",
          );
          triggerDownload(file, file.name.split(".").pop() ?? "mp4");
        });
      return;
    }
    triggerDownload(file, file.name.split(".").pop() ?? "mp4");
  }, [readyFile, triggerDownload]);






  useEffect(() => {
    if (stage !== "preview") setReadyFile(null);
  }, [stage]);

  // Aquece o processador de vídeo e o fechamento enquanto o usuário grava,
  // para que a montagem não comece do zero na hora de salvar.
  useEffect(() => {
    if (stage !== "camera") return;
    void (async () => {
      const [{ warmFFmpeg }, { fetchOutro }] = await Promise.all([
        import("@/lib/ffmpeg-client"),
        import("@/lib/append-outro"),
      ]);
      warmFFmpeg();
      void fetchOutro(true).catch(() => {});
    })();
  }, [stage]);

  // Assim que a prévia aparece, já monta o arquivo final em segundo plano.
  const autoPrepared = useRef<string | null>(null);
  useEffect(() => {
    if (stage !== "preview" || !rec.resultUrl) return;
    if (autoPrepared.current === rec.resultUrl) return;
    autoPrepared.current = rec.resultUrl;
    void prepareFile();
  }, [stage, rec.resultUrl, prepareFile]);


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
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[560px] px-4 pb-12 pt-8">
          <header className="mb-8">
            <h1 className="font-editorial text-[28px] font-bold leading-[1.15] text-foreground">
              Grave olhando para a câmera
            </h1>
            <p className="mt-2 font-editorial text-base leading-[1.45] text-muted-foreground">
              Cole seu roteiro, ajuste a rolagem e grave. O vídeo fica salvo no seu celular.
            </p>
          </header>

          <section className="space-y-8">
            <Card title="Roteiro a partir da notícia">
              <div className="space-y-2">
                <label htmlFor="url" className="block text-[13px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                  Link do artigo <span className="normal-case">(opcional)</span>
                </label>
                <Input
                  id="url"
                  type="url"
                  inputMode="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://site.com/materia"
                  className="h-12 rounded-lg border-border bg-background px-3.5 font-editorial text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
                />
                <p className="text-[13px] text-muted-foreground">
                  Geramos um roteiro em linguagem de manchete a partir da matéria.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="block text-[13px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                    Duração
                  </span>
                  <Segmented
                    options={(["30", "60", "90"] as const).map((d) => ({ value: d, label: `${d}s` }))}
                    value={duration}
                    onChange={setDuration}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="block text-[13px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                    Plataforma
                  </span>
                  <Segmented
                    options={[
                      { value: "reels", label: "Reels" },
                      { value: "youtube", label: "YouTube" },
                    ]}
                    value={platform}
                    onChange={setPlatform}
                  />
                </div>
              </div>

              <Button
                type="button"
                className={`relative h-12 w-full overflow-hidden rounded-lg text-[15px] font-semibold transition-all duration-200 ${
                  generating ? "ring-2 ring-ring/40" : ""
                }`}
                disabled={url.trim().length === 0 || generating}
                onClick={generateScript}
              >
                {generating ? (
                  <>
                    <Loader2 className="mr-2 size-5 animate-spin" />
                    <span className="relative z-10">Gerando roteiro...</span>
                    <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-primary-foreground/25 to-transparent" />
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-5" />
                    Gerar roteiro
                  </>
                )}
              </Button>

              {genError && (
                <p className="flex items-start gap-2 text-[13px] text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {genError}
                </p>
              )}
            </Card>

            <Card title="Roteiro">
              <label htmlFor="roteiro" className="block text-[13px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                Ajuste o roteiro ao seu estilo
              </label>
              <Textarea
                id="roteiro"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Cole aqui o texto que você vai ler..."
                className="max-h-[31.25rem] min-h-52 resize-y overflow-y-auto rounded-lg border-border bg-background px-3.5 py-3 font-editorial text-base leading-[1.6] text-foreground placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </Card>

            <Card title="Teleprompter" compact>
              <Row label="Velocidade" value={`${settings.speed} px/s`} compact>
                <Slider
                  value={[settings.speed]}
                  min={10}
                  max={200}
                  step={5}
                  onValueChange={([v]) => patch({ speed: v })}
                />
              </Row>
              <Row label="Tamanho da fonte" value={`${settings.fontSize} px`} compact>
                <Slider
                  value={[settings.fontSize]}
                  min={16}
                  max={72}
                  step={2}
                  onValueChange={([v]) => patch({ fontSize: v })}
                />
              </Row>
              <Row label="Opacidade da faixa" value={`${Math.round(settings.opacity * 100)}%`} compact>
                <Slider
                  value={[settings.opacity]}
                  min={0}
                  max={0.9}
                  step={0.05}
                  onValueChange={([v]) => patch({ opacity: v })}
                />
              </Row>
              <Row label="Altura da faixa" value={`${Math.round(settings.height * 100)}%`} compact>
                <Slider
                  value={[settings.height]}
                  min={0.25}
                  max={0.95}
                  step={0.05}
                  onValueChange={([v]) => patch({ height: v })}
                />
              </Row>
            </Card>

            <Card title="Vídeo">
              <span className="block text-[13px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                Formato do vídeo
              </span>
              <Segmented
                options={[
                  {
                    value: "vertical",
                    label: "Vertical 9:16",
                    icon: <RectangleVertical className="size-4" strokeWidth={1.5} />,
                  },
                  {
                    value: "horizontal",
                    label: "Horizontal 16:9",
                    icon: <RectangleHorizontal className="size-4" strokeWidth={1.5} />,
                  },
                ]}
                value={orientation}
                onChange={setOrientation}
              />
              {orientation === "horizontal" && (
                <p className="text-[13px] text-muted-foreground">
                  Gire o celular para o lado ao gravar na horizontal.
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                    Zoom
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums text-foreground">
                    {rec.zoom.toFixed(1)}x
                  </span>
                </div>
                <Slider
                  value={[rec.zoom]}
                  min={1}
                  max={rec.maxZoom}
                  step={0.1}
                  onValueChange={([v]) => rec.setZoom(v)}
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-[13px] font-medium uppercase tracking-[0.4px] text-muted-foreground">
                  Enquadramento
                </span>
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted p-1">
                  {(["cover", "contain"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => rec.setFit(mode)}
                      className={`rounded-md px-3 py-2 text-[13px] font-semibold transition-all duration-150 ${
                        rec.fit === mode
                          ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                          : "border border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/80 hover:text-primary"
                      }`}
                    >
                      {mode === "cover" ? "Preencher" : "Cabe tudo"}
                    </button>
                  ))}
                </div>
              </div>

              {rec.cameraCount !== 1 && (
                <button
                  type="button"
                  onClick={() => setFacing(facing === "user" ? "environment" : "user")}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-primary bg-transparent text-[15px] font-semibold text-primary transition-colors duration-150 hover:bg-primary/5"
                >
                  <SwitchCamera className="size-5" strokeWidth={1.5} />
                  {facing === "user" ? "Frontal" : "Traseira"}
                </button>
              )}
            </Card>

            <Card title="Fechamento">
              <label className="flex items-start gap-3 text-[15px] text-foreground">
                <Checkbox
                  checked={withOutro}
                  onCheckedChange={(v) => setWithOutro(v === true)}
                  className="mt-0.5 size-5 rounded border-border data-[state=checked]:border-primary data-[state=checked]:bg-primary"
                />
                <span className="flex-1">
                  Incluir vídeo de fechamento no download
                  <span className="mt-0.5 block text-[13px] text-muted-foreground">
                    Adiciona a vinheta final ao arquivo baixado.
                  </span>
                </span>
                <PortasKey size={32} />
              </label>
            </Card>

            {rec.error && (
              <div ref={errorRef} className="space-y-3 rounded-lg border border-border bg-card p-4">
                <p className="flex items-start gap-2 text-[13px] text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {rec.error}
                </p>
                {rec.errorKind === "iframe" && (
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, "_blank", "noopener")}
                    className="flex h-11 items-center justify-center gap-2 rounded-lg border-[1.5px] border-primary px-4 text-[15px] font-semibold text-primary transition-colors duration-150 hover:bg-primary/5"
                  >
                    <ExternalLink className="size-4" strokeWidth={1.5} />
                    Abrir em nova aba
                  </button>
                )}
              </div>
            )}

            <Button
              type="button"
              className="h-12 w-full rounded-lg text-[15px] font-semibold"
              disabled={text.trim().length === 0 || opening}
              onClick={() => openCamera()}
            >
              <Circle className="mr-2 size-5 fill-current" strokeWidth={1.5} />
              {opening ? "Abrindo câmera..." : "Iniciar gravação"}
            </Button>

            <div className="flex items-start gap-3 rounded-lg border border-border border-l-[3px] border-l-accent bg-card p-3">
              <Eye className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.5} />
              <p className="text-[13px] text-foreground">
                O teleprompter aparece só na sua tela — ele não fica gravado no vídeo.
              </p>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (stage === "preview" && rec.resultUrl) {
    const busy = merging || converting;
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[560px] px-4 pb-12 pt-8">
          <h1 className="font-editorial text-[28px] font-bold leading-[1.15] text-foreground">
            Sua gravação
          </h1>

          <div className="mt-6 space-y-4 rounded-lg border border-border bg-background p-4">
            <video
              src={rec.resultUrl}
              controls
              playsInline
              className="w-full rounded-lg bg-brand-dark"
            />

            {convertError && (
              <p className="flex items-start gap-2 text-[13px] text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {convertError}
              </p>
            )}

            {busy && (
              <div className="space-y-2">
                <div className="h-1 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-primary transition-all duration-200"
                    style={{
                      width: `${Math.round((merging ? mergeProgress : progress) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-sm text-foreground">Preparando seu vídeo…</p>
              </div>
            )}

            <Button
              type="button"
              className="h-12 w-full rounded-lg text-[15px] font-semibold"
              disabled={busy}
              onClick={readyFile ? saveReadyFile : prepareFile}
            >
              <Download className="mr-2 size-5" strokeWidth={1.5} />
              {merging
                ? `Montando vídeo... ${Math.round(mergeProgress * 100)}%`
                : converting
                  ? `Convertendo... ${Math.round(progress * 100)}%`
                  : readyFile
                    ? "Salvar nas Fotos"
                    : "Preparar vídeo para salvar"}
            </Button>

            {withOutro && (
              <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <KeyRound className="size-4 text-accent" strokeWidth={1.5} />
                Inclui o vídeo de fechamento do Portas
              </p>
            )}

            {mergeError && (
              <p className="flex items-start gap-2 text-[13px] text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                {mergeError}
              </p>
            )}

            <p className="text-[13px] text-muted-foreground">
              {readyFile
                ? 'Toque em "Salvar nas Fotos" e escolha "Salvar vídeo" na folha de compartilhamento do celular.'
                : "O vídeo já está sendo montado automaticamente. Assim que ficar pronto, o botão salva direto nas Fotos."}
            </p>

            <button
              type="button"
              onClick={() => {
                outroDone.current = false;
                rec.clearResult();
                openCamera();
              }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-primary text-[15px] font-semibold text-primary transition-colors duration-150 hover:bg-primary/5"
            >
              <RefreshCw className="size-4" strokeWidth={1.5} />
              Gravar novamente
            </button>
            <button
              type="button"
              onClick={() => {
                outroDone.current = false;
                rec.clearResult();
                rec.stopStream();
                setStage("setup");
              }}
              className="h-11 w-full text-[15px] font-semibold text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              Voltar ao roteiro
            </button>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <main className="dark fixed inset-0 flex flex-col overflow-hidden bg-brand-dark">
      {chromeVisible && (
        <RecorderTopBar recording={rec.recording} elapsed={rec.elapsed} onExit={exitCamera} />
      )}

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div
          className="relative max-h-full max-w-full overflow-hidden rounded-lg"
          style={{ aspectRatio: `${rec.aspect}` }}
        >
          <video
            ref={videoRef}
            muted
            playsInline
            autoPlay
            onClick={() => setChromeVisible((v) => !v)}
            className="size-full bg-brand-dark object-contain"
          />

          <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-brand-dark-border bg-brand-dark-2/70 px-2 py-1 text-[11px] text-on-dark">
            {platform === "reels" ? "Reels" : "YouTube"} ·{" "}
            {orientation === "vertical" ? "9:16" : "16:9"} · {duration}s
          </div>

          {chromeVisible && (
            <button
              type="button"
              onClick={flipCamera}
              aria-label="Trocar câmera"
              className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full bg-brand-dark-2/70 text-brand-light"
            >
              <SwitchCamera className="size-5" strokeWidth={1.5} />
            </button>
          )}

          <TeleprompterOverlay
            text={text}
            settings={settings}
            scrolling={scrolling}
            resetKey={resetKey}
          />
        </div>

        {speedHint !== null && (
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg bg-brand-dark-2/90 px-5 py-3 text-center">
            <div className="text-[11px] uppercase tracking-wide text-on-dark">Velocidade</div>
            <div className="text-2xl font-bold tabular-nums text-on-dark-strong">{speedHint}</div>
          </div>
        )}
      </div>

      {chromeVisible && (
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
      )}
    </main>
  );
}


function Card({ title, compact, children }: { title: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-3 rounded-lg border border-border bg-card p-4 ${compact ? "py-3" : ""}`}>
      <p className="kicker">{title}</p>
      <div className={compact ? "space-y-2" : "space-y-3"}>{children}</div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="grid gap-1.5 rounded-lg border border-border bg-muted p-1.5"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex h-10 items-center justify-center gap-1.5 rounded-md px-2 text-[13px] font-semibold transition-all duration-150 ${
              selected
                ? "bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30"
                : "border border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted/80 hover:text-primary"
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Row({
  label,
  value,
  compact,
  children,
}: {
  label: string;
  value: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={compact ? "space-y-0.5" : "space-y-1"}>
      <div className="flex items-baseline justify-between">
        <span className={`font-medium uppercase tracking-[0.4px] text-muted-foreground ${compact ? "text-[12px]" : "text-[13px]"}`}>
          {label}
        </span>
        <span className={`font-semibold tabular-nums text-foreground ${compact ? "text-[12px]" : "text-[13px]"}`}>{value}</span>
      </div>
      {children}
    </div>
  );
}

