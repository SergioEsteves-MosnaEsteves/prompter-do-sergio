import { PortasLockup, PortasWordmark } from "./PortasBrand";

export function SiteHeader() {
  return (
    <div className="dark sticky top-0 z-40">
      <header className="flex h-14 items-center border-b border-brand-dark-border bg-brand-dark px-4">
        <PortasLockup height={32} />
      </header>
      <div className="bg-brand-dark-2 px-4 py-1.5 text-center text-[12px] uppercase tracking-[0.5px] text-on-dark">
        Vídeos a partir das notícias do mercado imobiliário
      </div>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="dark mt-8 border-t border-brand-dark-border bg-brand-dark px-4 py-6">
      <div className="mx-auto flex max-w-[560px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PortasWordmark height={24} />
        <p className="text-[12px] leading-relaxed text-on-dark">
          Um produto do{" "}
          <a
            href="https://portas.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-light underline-offset-2 hover:underline"
          >
            Portas
          </a>
          , o portal de notícias do mercado imobiliário da Loft.
        </p>
      </div>
      <div className="mx-auto mt-4 flex max-w-[560px] items-center gap-3 text-[11px] text-on-dark">
        <a href="https://portas.com.br" target="_blank" rel="noopener noreferrer" className="hover:underline">
          Política de privacidade
        </a>
        <span>© Loft Brasil Tecnologia S.A.</span>
      </div>
    </footer>
  );
}
