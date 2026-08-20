import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { PortasWordmark } from "@/components/portas/PortasBrand";
import type { PrompterSettings } from "./TeleprompterOverlay";
import type { Fit } from "./useRecorder";
import { clampSpeed, SPEED_STEP } from "./useSpeedShortcuts";

function HoldButton({
  onPress,
  ariaLabel,
  children,
}: {
  onPress: () => void;
  ariaLabel: string;
  children: ReactNode;
}) {
  const timers = useRef<{ timeout?: ReturnType<typeof setTimeout>; interval?: ReturnType<typeof setInterval> }>({});
  const pressRef = useRef(onPress);
  pressRef.current = onPress;

  const stop = useCallback(() => {
    if (timers.current.timeout) clearTimeout(timers.current.timeout);
    if (timers.current.interval) clearInterval(timers.current.interval);
    timers.current = {};
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    pressRef.current();
    timers.current.timeout = setTimeout(() => {
      timers.current.interval = setInterval(() => pressRef.current(), 120);
    }, 450);
  }, []);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      className="flex size-11 min-h-11 min-w-11 select-none items-center justify-center rounded-full bg-brand-dark-2 text-brand-light transition-colors duration-150 active:opacity-70"
    >
      {children}
    </button>
  );
}


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
        className="flex size-11 items-center justify-center rounded-full bg-brand-dark-2 text-brand-light transition-colors duration-150 active:opacity-70"
      >
        <Minus className="size-5" strokeWidth={1.5} />
      </button>
      <div className="min-w-16 text-center">
        <div className="text-[11px] uppercase tracking-wide text-on-dark">{label}</div>
        <div className="text-sm font-semibold text-on-dark-strong">{value}</div>
      </div>
      <button
        type="button"
        onClick={onInc}
        aria-label={`Aumentar ${label}`}
        className="flex size-11 items-center justify-center rounded-full bg-brand-dark-2 text-brand-light transition-colors duration-150 active:opacity-70"
      >
        <Plus className="size-5" strokeWidth={1.5} />
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
  if (recording) {
    return (
      <div className="pointer-events-auto shrink-0 bg-brand-dark px-4 py-3">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleScroll}
              aria-label={scrolling ? "Pausar rolagem" : "Iniciar rolagem"}
              className="flex size-10 min-h-10 min-w-10 items-center justify-center rounded-full bg-brand-dark-2 text-brand-light"
            >
              {scrolling ? (
                <Pause className="size-4" strokeWidth={1.5} />
              ) : (
                <Play className="size-4" strokeWidth={1.5} />
              )}
            </button>
            <button
              type="button"
              onClick={onRestart}
              aria-label="Reiniciar roteiro"
              className="flex size-10 min-h-10 min-w-10 items-center justify-center rounded-full bg-brand-dark-2 text-brand-light"
            >
              <RotateCcw className="size-4" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center gap-5">
            <HoldButton
              onPress={() => onChange({ speed: clampSpeed(settings.speed - SPEED_STEP) })}
              ariaLabel="Diminuir velocidade do teleprompter"
            >
              <Minus className="size-5" strokeWidth={1.5} />
            </HoldButton>

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={onToggleRecord}
                aria-label="Parar gravação"
                className="flex size-[72px] items-center justify-center rounded-full border-[3px] border-brand-light p-1.5"
              >
                <span className="size-7 rounded-md bg-brand" />
              </button>
              <span className="text-[11px] leading-none text-on-dark">
                Velocidade <span className="tabular-nums text-on-dark-strong">{settings.speed}</span>
              </span>
            </div>

            <HoldButton
              onPress={() => onChange({ speed: clampSpeed(settings.speed + SPEED_STEP) })}
              ariaLabel="Aumentar velocidade do teleprompter"
            >
              <Plus className="size-5" strokeWidth={1.5} />
            </HoldButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto max-h-[45vh] shrink-0 space-y-4 overflow-y-auto bg-brand-dark px-4 pb-6 pt-4">

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onToggleScroll}
              aria-label={scrolling ? "Pausar rolagem" : "Iniciar rolagem"}
              className="flex size-11 items-center justify-center rounded-full bg-brand-dark-2 text-brand-light"
            >
              {scrolling ? <Pause className="size-5" strokeWidth={1.5} /> : <Play className="size-5" strokeWidth={1.5} />}
            </button>
            <button
              type="button"
              onClick={onRestart}
              aria-label="Reiniciar roteiro"
              className="flex size-11 items-center justify-center rounded-full bg-brand-dark-2 text-brand-light"
            >
              <RotateCcw className="size-5" strokeWidth={1.5} />
            </button>
          </div>

          <Stepper
            label="Fonte"
            value={`${settings.fontSize}`}
            onDec={() => onChange({ fontSize: Math.max(16, settings.fontSize - 2) })}
            onInc={() => onChange({ fontSize: Math.min(72, settings.fontSize + 2) })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-on-dark">Opacidade</span>
            <Slider
              value={[settings.opacity]}
              min={0}
              max={0.9}
              step={0.05}
              onValueChange={([v]) => onChange({ opacity: v })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-on-dark">Altura</span>
            <Slider
              value={[settings.height]}
              min={0.25}
              max={0.95}
              step={0.05}
              onValueChange={([v]) => onChange({ height: v })}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="flex items-baseline justify-between text-[11px] uppercase tracking-wide text-on-dark">
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
          <span className="text-[11px] uppercase tracking-wide text-on-dark">Enquadramento</span>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-brand-dark-2 p-1">
            {(["cover", "contain"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onFitChange(mode)}
                className={`rounded-md px-3 py-2 text-[13px] transition-colors duration-150 ${
                  fit === mode
                    ? "bg-brand font-semibold text-white"
                    : "font-medium text-on-dark"
                }`}
              >
                {mode === "cover" ? "Preencher" : "Cabe tudo"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 pt-1">
          <div className="flex flex-col items-center gap-1">
            <HoldButton
              onPress={() => onChange({ speed: clampSpeed(settings.speed - SPEED_STEP) })}
              ariaLabel="Diminuir velocidade do teleprompter"
            >
              <Minus className="size-5" strokeWidth={1.5} />
            </HoldButton>
            <span className="text-[11px] text-on-dark">Menos</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onToggleRecord}
              aria-label="Gravar"
              className="flex size-[72px] items-center justify-center rounded-full border-[3px] border-brand-light p-1.5"
            >
              <span className="size-full rounded-full bg-brand" />
            </button>
            <span className="text-[11px] text-on-dark">
              Velocidade <span className="tabular-nums text-on-dark-strong">{settings.speed}</span>
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <HoldButton
              onPress={() => onChange({ speed: clampSpeed(settings.speed + SPEED_STEP) })}
              ariaLabel="Aumentar velocidade do teleprompter"
            >
              <Plus className="size-5" strokeWidth={1.5} />
            </HoldButton>
            <span className="text-[11px] text-on-dark">Mais</span>
          </div>
        </div>
    </div>
  );
}

export function RecorderTopBar({
  recording,
  elapsed,
  onExit,
}: {
  recording: boolean;
  elapsed: number;
  onExit: () => void;
}) {
  return (
    <div className="pointer-events-auto flex h-14 shrink-0 items-center justify-between border-b border-brand-dark-border bg-brand-dark px-4">
      <PortasWordmark height={24} />
      <div className="flex items-center gap-2 text-base font-semibold tabular-nums text-on-dark-strong">
        {recording && <span className="size-2.5 animate-pulse rounded-full bg-brand" />}
        {fmt(elapsed)}
      </div>
      <button
        type="button"
        onClick={onExit}
        className="text-[13px] font-semibold text-brand-light transition-colors duration-150"
      >
        Roteiro
      </button>
    </div>
  );
}

