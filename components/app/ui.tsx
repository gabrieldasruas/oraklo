import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

type Tone = "lime" | "sun" | "coral" | "mint" | "lilac" | "night";

export function Glass({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`glass ${className}`}>{children}</div>;
}

export function Aura({
  tone,
  children,
  className = "",
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`aura-${tone} relative overflow-hidden rounded-[28px] ${className}`}>
      {children}
    </div>
  );
}

// Rótulo minúsculo em mono, no estilo "metadado" da referência.
export function Micro({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`font-mono text-[10px] uppercase tracking-[0.2em] opacity-55 ${className}`}>
      {children}
    </p>
  );
}

// Arte generativa em linhas finas (wireframe).
export function WireArt({
  kind,
  className = "",
  spin = false,
}: {
  kind: "orbit" | "rings" | "waves" | "fan";
  className?: string;
  spin?: boolean;
}) {
  const n = 14;
  const f = (v: number) => v.toFixed(2);
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
      className={`${spin ? "drift" : ""} ${className}`}
      aria-hidden
    >
      {kind === "orbit" &&
        Array.from({ length: n }, (_, i) => (
          <ellipse
            key={i}
            cx="100"
            cy="100"
            rx="92"
            ry="34"
            transform={`rotate(${f(i * (180 / n))} 100 100)`}
          />
        ))}
      {kind === "rings" &&
        Array.from({ length: n }, (_, i) => (
          <ellipse key={i} cx="100" cy="100" rx="90" ry={6 + i * 6} />
        ))}
      {kind === "waves" &&
        Array.from({ length: n }, (_, i) => {
          const y = 30 + i * 10;
          return (
            <path
              key={i}
              d={`M0 ${y} C 40 ${y - 30}, 70 ${y + 30}, 100 ${y} S 160 ${y - 30}, 200 ${y}`}
            />
          );
        })}
      {kind === "fan" &&
        Array.from({ length: 28 }, (_, i) => {
          const a = Math.PI * (0.08 + (0.84 * i) / 27);
          return (
            <line
              key={i}
              x1="100"
              y1="195"
              x2={f(100 + Math.cos(a) * 175)}
              y2={f(195 - Math.sin(a) * 175)}
            />
          );
        })}
    </svg>
  );
}

// Botão-pílula com seta em círculo. Vira link quando recebe `href`.
export function Pill({
  children,
  onClick,
  href,
  type = "button",
  tone = "dark",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  tone?: "dark" | "neon" | "ghost";
  className?: string;
}) {
  const tones = {
    dark: "bg-night text-white",
    neon: "bg-neon text-night",
    ghost: "border border-night/15 bg-white/60 text-night",
  };
  const cls = `group flex min-h-12 w-fit cursor-pointer items-center gap-3 rounded-full py-1.5 pl-6 pr-1.5 text-sm font-medium transition-transform hover:-translate-y-0.5 ${tones[tone]} ${className}`;
  const arrow = (
    <span
      className={`flex size-9 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-45 ${
        tone === "dark" ? "bg-neon text-night" : "bg-night text-neon"
      }`}
    >
      <ArrowUpRight size={16} aria-hidden />
    </span>
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
        {arrow}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${cls} disabled:cursor-wait disabled:opacity-50 disabled:hover:translate-y-0`}>
      {children}
      {arrow}
    </button>
  );
}
