import { Aperture } from "lucide-react";

export function AppMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="glass-chip flex items-center justify-center rounded-xl text-foreground"
      style={{ width: size, height: size }}
    >
      <Aperture style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={1.5} />
    </span>
  );
}

export function AppWordmark({ height = 28 }: { height?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <AppMark size={height} />
      <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
        Prompter
      </span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <div className="sticky top-0 z-40 px-4 pt-3">
      <header className="glass mx-auto flex h-14 max-w-[560px] items-center justify-between rounded-2xl px-4">
        <AppWordmark height={30} />
        <span className="text-[12px] text-muted-foreground">Grave com teleprompter</span>
      </header>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-8 max-w-[560px] px-4 pb-8 text-center text-[12px] text-muted-foreground">
      Seus vídeos ficam só no seu aparelho.
    </footer>
  );
}
