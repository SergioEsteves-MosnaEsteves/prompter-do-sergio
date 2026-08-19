/**
 * Marca Portas.
 * TODO: substituir o wordmark/símbolo abaixo pelo SVG oficial do Portas
 * (wordmark + chave) quando ele estiver disponível no projeto.
 */

export function PortasKey({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: "var(--portas-dark)",
        color: "var(--portas-primary-light)",
        fontFamily: "var(--portas-font-serif)",
        fontWeight: 700,
        fontSize: size * 0.62,
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-hidden
    >
      P
    </span>
  );
}

export function PortasWordmark({ height = 32 }: { height?: number }) {
  return (
    <span
      className="font-editorial font-bold text-on-dark-strong"
      style={{ fontSize: height * 0.75, lineHeight: 1 }}
    >
      Portas
    </span>
  );
}

export function PortasLockup({ height = 32 }: { height?: number }) {
  return (
    <span className="flex items-center gap-2">
      <PortasWordmark height={height} />
      <span
        className="text-brand-light"
        style={{
          fontFamily: "var(--portas-font-sans)",
          fontWeight: 600,
          fontSize: height * 0.44,
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        Prompter
      </span>
    </span>
  );
}
