import { Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { PrompterSettings } from "./TeleprompterOverlay";
import type { Fit } from "./useRecorder";

type Props = {
  settings: PrompterSettings;
  onChange: (patch: Partial<PrompterSettings>) => void;
  scrolling: boolean;
  onToggleScroll: () => void;
  onRestart: () => void;
  recording: boolean;
  elapsed: number;
  onToggleRecord: () => void;
  onExit: () => void;
  zoom: number;
  maxZoom: number;
  onZoomChange: (value: number) => void;
  fit: Fit;
  onFitChange: (value: Fit) => void;
};

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
}: {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDec}
        aria-label={`Diminuir ${label}`}
        className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
      >
        <Minus className="size-4" />
      </button>
      <div className="min-w-16 text-center">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
      <button
        type="button"
        onClick={onInc}
        aria-label={`Aumentar ${label}`}
        className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground active:opacity-70"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function RecorderControls({
  settings,
  onChange,
  scrolling,
  onToggleScroll,
  onRestart,
  recording,
  elapsed,
  onToggleRecord,
  onExit,
  zoom,
  maxZoom,
  onZoomChange,
  fit,
  onFitChange,
}: Props) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 space-y-4 bg-gradient-to-t from-background via-background/90 to-transparent px-4 pb-6 pt-8">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onExit}
          className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
        >
          Roteiro
        </button>
        <div className="flex items-center gap-2 text-sm font-semibold tabular-nums text-foreground">
          {recording && <span className="size-2.5 animate-pulse rounded-full bg-destructive" />}
          {fmt(elapsed)}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleScroll}
            aria-label={scrolling ? "Pausar rolagem" : "Iniciar rolagem"}
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          >
            {scrolling ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            type="button"
            onClick={onRestart}
            aria-label="Reiniciar roteiro"
            className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          >
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Stepper
          label="Velocidade"
          value={`${settings.speed}`}
          onDec={() => onChange({ speed: Math.max(10, settings.speed - 5) })}
          onInc={() => onChange({ speed: Math.min(200, settings.speed + 5) })}
        />
        <Stepper
          label="Fonte"
          value={`${settings.fontSize}`}
          onDec={() => onChange({ fontSize: Math.max(16, settings.fontSize - 2) })}
          onInc={() => onChange({ fontSize: Math.min(72, settings.fontSize + 2) })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Opacidade</span>
          <Slider
            value={[settings.opacity]}
            min={0}
            max={0.9}
            step={0.05}
            onValueChange={([v]) => onChange({ opacity: v })}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Altura</span>
          <Slider
            value={[settings.height]}
            min={0.25}
            max={0.95}
            step={0.05}
            onValueChange={([v]) => onChange({ height: v })}
          />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="flex items-baseline justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
          Zoom
          <span className="tabular-nums">{zoom.toFixed(1)}x</span>
        </span>
        <Slider
          value={[zoom]}
          min={1}
          max={maxZoom}
          step={0.1}
          onValueChange={([v]) => onZoomChange(v)}
        />
      </label>

      <div className="space-y-1.5">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Enquadramento
        </span>
        <div className="grid grid-cols-2 gap-2">
          {(["cover", "contain"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onFitChange(mode)}
              className={`rounded-full px-3 py-2 text-xs font-medium ${
                fit === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {mode === "cover" ? "Preencher" : "Cabe tudo"}
            </button>
          ))}
        </div>
      </div>


      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={onToggleRecord}
          aria-label={recording ? "Parar gravação" : "Gravar"}
          className="flex size-18 items-center justify-center rounded-full border-4 border-foreground/80 p-1"
        >
          <span
            className={
              recording
                ? "size-7 rounded-md bg-destructive"
                : "size-full rounded-full bg-destructive"
            }
          />
        </button>
      </div>
    </div>
  );
}
