/**
 * Marca Portas.
 * O símbolo da chave abaixo reproduz o ícone oficial (círculo vazado + haste).
 * TODO: trocar pelo SVG oficial do wordmark quando ele estiver disponível.
 */

export function PortasKeyIcon({
  size = 20,
  color = "var(--portas-primary-light)",
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 40"
      width={size * 1.6}
      height={size}
      className={className}
      aria-hidden
      focusable="false"
    >
      <circle cx="16" cy="20" r="12" fill="none" stroke={color} strokeWidth="8" />
      <path d="M26 14 L54 14 L48 26 L26 26 Z" fill={color} />
    </svg>

  );
}

export function PortasKey({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: "var(--portas-dark)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-hidden
    >
      <PortasKeyIcon size={size * 0.42} />
    </span>
  );
}

export function PortasWordmark({ height = 32 }: { height?: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <PortasKeyIcon size={height * 0.4} color="var(--portas-on-dark-strong)" />
      <span
        className="font-editorial font-bold text-on-dark-strong"
        style={{ fontSize: height * 0.75, lineHeight: 1 }}
      >
        Portas
      </span>
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
