import { useEffect, useRef } from "react";

export type PrompterSettings = {
  speed: number; // px per second
  fontSize: number; // px
  opacity: number; // 0..1
  height: number; // 0..1 of screen height
};

type Props = {
  text: string;
  settings: PrompterSettings;
  scrolling: boolean;
  /** changing this value resets scroll to the top */
  resetKey: number;
};

export function TeleprompterOverlay({ text, settings, scrolling, resetKey }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    offsetRef.current = 0;
    if (contentRef.current) contentRef.current.style.transform = "translate3d(0,0,0)";
  }, [resetKey]);

  useEffect(() => {
    if (!scrolling) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      const viewport = viewportRef.current;
      const content = contentRef.current;
      if (viewport && content) {
        const max = Math.max(0, content.scrollHeight - viewport.clientHeight * 0.35);
        offsetRef.current = Math.min(max, offsetRef.current + settings.speed * dt);
        content.style.transform = `translate3d(0, ${-offsetRef.current}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scrolling, settings.speed]);

  return (
    <div
      ref={viewportRef}
      className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
      style={{
        height: `${settings.height * 100}%`,
        backgroundColor: `color-mix(in srgb, var(--portas-dark-2) ${settings.opacity * 100}%, transparent)`,
      }}
    >
      <div
        ref={contentRef}
        className="font-editorial px-5 text-center font-semibold will-change-transform"
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: 1.35,
          color: "var(--portas-on-dark-strong)",
          paddingTop: "18%",
          paddingBottom: "60%",
          textShadow: "0 2px 10px rgb(0 0 0 / 0.75)",
        }}
      >
        {text.split("\n").map((line, i) => (
          <p key={i} className="mb-3 whitespace-pre-wrap">
            {line || "\u00A0"}
          </p>
        ))}
      </div>

      {/* gradientes de entrada e saída do texto */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-12"
        style={{
          background: "linear-gradient(to bottom, var(--portas-dark-2), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
        style={{
          background: "linear-gradient(to top, var(--portas-dark-2), transparent)",
        }}
      />

      {/* linha de leitura */}
      <div className="absolute inset-x-0 flex items-center gap-2 px-3" style={{ top: "18%" }}>
        <span className="h-0.5 w-8 rounded-full bg-brand-light" />
        <span className="flex-1" />
        <span className="h-0.5 w-8 rounded-full bg-brand-light" />
      </div>
    </div>
  );
}
