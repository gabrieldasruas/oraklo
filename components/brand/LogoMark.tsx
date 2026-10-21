"use client";

import { useEffect, useId, useRef, useState } from "react";

/*
 * Logo do Prospecta: lupa cibernética.
 * - Aro metálico, lente de vidro iridescente com grade de varredura e o ponto neon
 *   no centro (o "lead encontrado"), cabo grafite com anel neon.
 * - Animação inspirada em ícones que trocam de "acabamento" em loop:
 *   vidro 3D → neon → LED → meio-tom, cada um numa cor da paleta do site.
 *
 * Geometria (viewBox 200×200): lente em (84,84), cabo a 45° para baixo/direita.
 */

const C = 84; // centro da lente
const R = 56; // raio da linha central do aro
const RING = 15; // espessura do aro

export type LogoMode = "glass" | "neon" | "led" | "halftone";
const CYCLE: { mode: LogoMode; ms: number }[] = [
  { mode: "glass", ms: 2600 },
  { mode: "neon", ms: 1500 },
  { mode: "led", ms: 1500 },
  { mode: "halftone", ms: 1500 },
];

const COLORS: Record<Exclude<LogoMode, "glass">, string> = {
  neon: "#b8ff3c",
  led: "#ff5f86",
  halftone: "#9fb2ff",
};

/** Silhueta da lupa num canvas (para os modos LED e meio-tom). */
function silhouette(ctx: CanvasRenderingContext2D, s: number) {
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(10, 10); // mesma margem do viewBox -10 -10 220 220
  ctx.lineCap = "round";
  ctx.strokeStyle = ctx.fillStyle = "#fff";
  ctx.lineWidth = RING;
  ctx.beginPath();
  ctx.arc(C, C, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.translate(C, C);
  ctx.rotate(Math.PI / 4);
  ctx.beginPath();
  ctx.roundRect(R + 6, -14, 18, 28, 5);
  ctx.roundRect(R + 22, -13, 70, 26, 13);
  ctx.fill();
  ctx.rotate(-Math.PI / 4);
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Desenha a lupa em pontos: `led` = grade regular; `halftone` = pontos que variam de tamanho. */
function DotMode({ mode, color, size }: { mode: "led" | "halftone"; color: string; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = size * dpr;
    cv.width = cv.height = px;
    const ctx = cv.getContext("2d")!;

    // silhueta borrada (o borrão vira o "degradê" do meio-tom)
    const off = document.createElement("canvas");
    off.width = off.height = px;
    const o = off.getContext("2d")!;
    if (mode === "halftone") o.filter = `blur(${px * 0.025}px)`;
    silhouette(o, px / 220);
    const data = o.getImageData(0, 0, px, px).data;

    const step = mode === "led" ? px / 46 : px / 38;
    ctx.clearRect(0, 0, px, px);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = mode === "led" ? step * 0.9 : 0;
    for (let y = step / 2; y < px; y += step) {
      for (let x = step / 2; x < px; x += step) {
        const a = data[(Math.floor(y) * px + Math.floor(x)) * 4 + 3] / 255;
        if (mode === "led") {
          if (a < 0.5) continue;
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.arc(x, y, step * 0.36, 0, Math.PI * 2);
          ctx.fill();
        } else {
          if (a < 0.04) continue;
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(x, y, step * 0.55 * Math.sqrt(a), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [mode, color, size]);
  return <canvas ref={ref} className={`size-full ${mode === "led" ? "led-flicker" : ""}`} />;
}

/** Versão "vidro 3D" (a principal, usada também parada em tamanhos pequenos). */
export function LogoGlass({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const u = (n: string) => `${n}-${id}`;
  return (
    <svg viewBox="-10 -10 220 220" overflow="visible" className={className} aria-hidden>
      <defs>
        {/* aro: cromo com reflexo neon */}
        <linearGradient id={u("rim")} x1="20%" y1="10%" x2="80%" y2="95%">
          <stop offset="0" stopColor="#fbfff0" />
          <stop offset="0.22" stopColor="#d6ff8a" />
          <stop offset="0.45" stopColor="#5f8f12" />
          <stop offset="0.62" stopColor="#1b2408" />
          <stop offset="0.8" stopColor="#b8ff3c" />
          <stop offset="1" stopColor="#f2ffd1" />
        </linearGradient>
        <linearGradient id={u("rimIn")} x1="80%" y1="90%" x2="20%" y2="10%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* lente iridescente */}
        <radialGradient id={u("lens")} cx="38%" cy="34%" r="75%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="0.3" stopColor="#bdf3ff" stopOpacity="0.8" />
          <stop offset="0.58" stopColor="#c9b6ff" stopOpacity="0.75" />
          <stop offset="0.82" stopColor="#ffc2e4" stopOpacity="0.7" />
          <stop offset="1" stopColor="#7ee8fa" stopOpacity="0.85" />
        </radialGradient>
        <linearGradient id={u("handle")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5b5d68" />
          <stop offset="0.35" stopColor="#24252b" />
          <stop offset="1" stopColor="#0b0b0c" />
        </linearGradient>
        <linearGradient id={u("collar")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2ffd1" />
          <stop offset="0.45" stopColor="#b8ff3c" />
          <stop offset="1" stopColor="#3d5c00" />
        </linearGradient>
        <pattern id={u("grid")} width="9" height="9" patternUnits="userSpaceOnUse">
          <path d="M9 0H0V9" fill="none" stroke="#0b0b0c" strokeOpacity="0.16" strokeWidth="0.8" />
        </pattern>
        <clipPath id={u("clip")}>
          <circle cx={C} cy={C} r={R - RING / 2 + 1} />
        </clipPath>
        <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#000" floodOpacity="0.55" />
        </filter>
        <filter id={u("glow")} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#${u("shadow")})`}>
        {/* cabo + anel */}
        <g transform={`rotate(45 ${C} ${C})`}>
          <rect x={C + R + 22} y={C - 13} width="70" height="26" rx="13" fill={`url(#${u("handle")})`} />
          <rect x={C + R + 30} y={C - 11} width="54" height="5" rx="2.5" fill="#fff" opacity="0.18" />
          <rect x={C + R + 6} y={C - 14} width="18" height="28" rx="5" fill={`url(#${u("collar")})`} />
          <rect x={C + R + 8} y={C - 12} width="14" height="4" rx="2" fill="#fff" opacity="0.55" />
        </g>

        {/* lente */}
        <g clipPath={`url(#${u("clip")})`}>
          <circle cx={C} cy={C} r={R} fill={`url(#${u("lens")})`} />
          <rect x="0" y="0" width="200" height="200" fill={`url(#${u("grid")})`} />
          {/* linha de varredura */}
          <rect className="lens-scan" x={C - R} y={C - 2} width={R * 2} height="4" fill="#b8ff3c" opacity="0.55" />
          {/* reflexo */}
          <ellipse cx={C - 16} cy={C - 20} rx="30" ry="14" transform={`rotate(-35 ${C - 16} ${C - 20})`} fill="#fff" opacity="0.75" />
          <ellipse cx={C + 22} cy={C + 26} rx="12" ry="5" transform={`rotate(-35 ${C + 22} ${C + 26})`} fill="#fff" opacity="0.45" />
        </g>

        {/* ponto neon: o lead encontrado */}
        <g filter={`url(#${u("glow")})`}>
          <circle className="lens-dot" cx={C} cy={C} r="10" fill="#b8ff3c" />
        </g>
        <circle cx={C} cy={C} r="20" fill="none" stroke="#0b0b0c" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 4" />

        {/* aro */}
        <circle cx={C} cy={C} r={R} fill="none" stroke={`url(#${u("rim")})`} strokeWidth={RING} />
        <circle cx={C} cy={C} r={R - RING / 2 + 1.5} fill="none" stroke={`url(#${u("rimIn")})`} strokeWidth="2" />
        <circle cx={C} cy={C} r={R + RING / 2 - 1} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.2" />
      </g>
    </svg>
  );
}

/** Versão neon: só contornos acesos. */
function LogoNeon({ color }: { color: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="-10 -10 220 220" overflow="visible" className="size-full" aria-hidden>
      <defs>
        <filter id={`n-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b1" />
          <feGaussianBlur stdDeviation="2" in="SourceGraphic" result="b2" />
          <feMerge>
            <feMergeNode in="b1" />
            <feMergeNode in="b1" />
            <feMergeNode in="b2" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#n-${id})`} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round">
        <circle cx={C} cy={C} r={R} />
        <circle cx={C} cy={C} r={R - 12} strokeWidth="2" strokeOpacity="0.6" />
        <g transform={`rotate(45 ${C} ${C})`}>
          <rect x={C + R + 24} y={C - 11} width="66" height="22" rx="11" />
          <path d={`M${C + R + 8} ${C - 12}v24`} />
        </g>
        <circle cx={C} cy={C} r="9" fill={color} />
      </g>
    </svg>
  );
}

/**
 * Logo animado: troca de acabamento em loop. Passar o mouse pausa no vidro e inclina
 * a lupa em 3D. `animated={false}` mostra só o vidro (para tamanhos pequenos).
 */
export default function LogoMark({
  size = 140,
  animated = true,
  only,
  className = "",
}: {
  size?: number;
  animated?: boolean;
  /** força um acabamento fixo (sem o loop) */
  only?: LogoMode;
  className?: string;
}) {
  const [step, setStep] = useState(0);
  const [hover, setHover] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated || hover || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(0);
      return;
    }
    const t = setTimeout(() => setStep((s) => (s + 1) % CYCLE.length), CYCLE[step].ms);
    return () => clearTimeout(t);
  }, [step, hover, animated]);

  const mode = only ?? CYCLE[step].mode;

  return (
    <div
      ref={box}
      role="img"
      aria-label="Prospecta"
      className={`logo-mark relative ${className}`}
      style={{ width: size, height: size }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => {
        setHover(false);
        box.current?.style.setProperty("--rx", "0deg");
        box.current?.style.setProperty("--ry", "0deg");
      }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        e.currentTarget.style.setProperty("--rx", `${-y * 24}deg`);
        e.currentTarget.style.setProperty("--ry", `${x * 24}deg`);
      }}
    >
      {/* brilho atrás, na cor do acabamento atual */}
      <div
        aria-hidden
        className="absolute inset-[12%] rounded-full blur-2xl transition-colors duration-700"
        style={{ background: mode === "glass" ? "rgba(184,255,60,0.35)" : `${COLORS[mode]}55` }}
      />
      <div className="logo-tilt relative size-full">
        {/* cada acabamento entra com um "glitch" curto (classe logo-swap reinicia via key) */}
        <div key={mode} className="logo-swap absolute inset-0">
          {mode === "glass" && <LogoGlass className="size-full" />}
          {mode === "neon" && <LogoNeon color={COLORS.neon} />}
          {(mode === "led" || mode === "halftone") && <DotMode mode={mode} color={COLORS[mode]} size={size} />}
        </div>
      </div>
    </div>
  );
}
