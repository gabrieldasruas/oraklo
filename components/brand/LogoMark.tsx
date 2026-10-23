"use client";

import { cores } from "@/lib/colors";
import { useEffect, useId, useRef, useState } from "react";

/*
 * Logo do Oraklo: lupa cibernética (o oráculo que enxerga quem vai comprar).
 * - Aro metálico, lente de vidro iridescente com grade de varredura e o ponto neon
 *   no centro (o "lead encontrado"), cabo grafite com anel neon.
 * - Animação: a lupa gira no próprio eixo como uma moeda, alternando entre a face
 *   de vidro e a face neon, com uma faixa de luz passando durante o giro.
 *
 * Geometria (viewBox 200×200): lente em (84,84), cabo a 45° para baixo/direita.
 */

const C = 84; // centro da lente
const R = 56; // raio da linha central do aro
const RING = 15; // espessura do aro
const HOLD = 2800; // ms parada em cada face antes de girar

export type LogoMode = "glass" | "neon";

/** Versão "vidro 3D" (a principal, usada também parada em tamanhos pequenos). */
export function LogoGlass({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const u = (n: string) => `${n}-${id}`;
  return (
    <svg viewBox="-10 -10 220 220" overflow="visible" className={className} aria-hidden>
      <defs>
        {/* aro: cromo com reflexo neon */}
        <linearGradient id={u("rim")} x1="20%" y1="10%" x2="80%" y2="95%">
          <stop offset="0" stopColor={cores["logo-aro-1"]} />
          <stop offset="0.22" stopColor={cores["logo-aro-2"]} />
          <stop offset="0.45" stopColor={cores["logo-aro-3"]} />
          <stop offset="0.62" stopColor={cores["logo-aro-4"]} />
          <stop offset="0.8" stopColor={cores.neon} />
          <stop offset="1" stopColor={cores["logo-aro-5"]} />
        </linearGradient>
        <linearGradient id={u("rimIn")} x1="80%" y1="90%" x2="20%" y2="10%">
          <stop offset="0" stopColor={cores.branco} stopOpacity="0.9" />
          <stop offset="0.5" stopColor={cores.branco} stopOpacity="0" />
        </linearGradient>
        {/* lente iridescente */}
        <radialGradient id={u("lens")} cx="38%" cy="34%" r="75%">
          <stop offset="0" stopColor={cores.branco} stopOpacity="0.95" />
          <stop offset="0.3" stopColor={cores["logo-lente-1"]} stopOpacity="0.8" />
          <stop offset="0.58" stopColor={cores["logo-lente-2"]} stopOpacity="0.75" />
          <stop offset="0.82" stopColor={cores["logo-lente-3"]} stopOpacity="0.7" />
          <stop offset="1" stopColor={cores["logo-lente-4"]} stopOpacity="0.85" />
        </radialGradient>
        <linearGradient id={u("handle")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cores["logo-cabo-1"]} />
          <stop offset="0.35" stopColor={cores["logo-cabo-2"]} />
          <stop offset="1" stopColor={cores.night} />
        </linearGradient>
        <linearGradient id={u("collar")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cores["logo-aro-5"]} />
          <stop offset="0.45" stopColor={cores.neon} />
          <stop offset="1" stopColor={cores["logo-neon-fundo"]} />
        </linearGradient>
        <pattern id={u("grid")} width="9" height="9" patternUnits="userSpaceOnUse">
          <path d="M9 0H0V9" fill="none" stroke={cores.night} strokeOpacity="0.16" strokeWidth="0.8" />
        </pattern>
        <clipPath id={u("clip")}>
          <circle cx={C} cy={C} r={R - RING / 2 + 1} />
        </clipPath>
        <filter id={u("shadow")} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor={cores.preto} floodOpacity="0.55" />
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
          <rect x={C + R + 30} y={C - 11} width="54" height="5" rx="2.5" fill={cores.branco} opacity="0.18" />
          <rect x={C + R + 6} y={C - 14} width="18" height="28" rx="5" fill={`url(#${u("collar")})`} />
          <rect x={C + R + 8} y={C - 12} width="14" height="4" rx="2" fill={cores.branco} opacity="0.55" />
        </g>

        {/* lente */}
        <g clipPath={`url(#${u("clip")})`}>
          <circle cx={C} cy={C} r={R} fill={`url(#${u("lens")})`} />
          <rect x="0" y="0" width="200" height="200" fill={`url(#${u("grid")})`} />
          {/* linha de varredura */}
          <rect className="lens-scan" x={C - R} y={C - 2} width={R * 2} height="4" fill={cores.neon} opacity="0.55" />
          {/* reflexo */}
          <ellipse cx={C - 16} cy={C - 20} rx="30" ry="14" transform={`rotate(-35 ${C - 16} ${C - 20})`} fill={cores.branco} opacity="0.75" />
          <ellipse cx={C + 22} cy={C + 26} rx="12" ry="5" transform={`rotate(-35 ${C + 22} ${C + 26})`} fill={cores.branco} opacity="0.45" />
        </g>

        {/* ponto neon: o lead encontrado */}
        <g filter={`url(#${u("glow")})`}>
          <circle className="lens-dot" cx={C} cy={C} r="10" fill={cores.neon} />
        </g>
        <circle cx={C} cy={C} r="20" fill="none" stroke={cores.night} strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 4" />

        {/* aro */}
        <circle cx={C} cy={C} r={R} fill="none" stroke={`url(#${u("rim")})`} strokeWidth={RING} />
        <circle cx={C} cy={C} r={R - RING / 2 + 1.5} fill="none" stroke={`url(#${u("rimIn")})`} strokeWidth="2" />
        <circle cx={C} cy={C} r={R + RING / 2 - 1} fill="none" stroke={cores.branco} strokeOpacity="0.35" strokeWidth="1.2" />
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
 * Logo animado: gira entre vidro e neon. Passar o mouse para no vidro e inclina a lupa
 * em 3D seguindo o cursor. `animated={false}` mostra só o vidro (tamanhos pequenos).
 */
export default function LogoMark({
  size = 140,
  animated = true,
  only,
  className = "",
}: {
  /** px ou qualquer medida CSS (ex.: "100%" para preencher o pai) */
  size?: number | string;
  animated?: boolean;
  /** força uma face fixa (sem o giro) */
  only?: LogoMode;
  className?: string;
}) {
  const [turns, setTurns] = useState(0); // cada giro soma meia volta
  const [hover, setHover] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (only || !animated || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (hover) {
      // volta para a face de vidro mais próxima
      setTurns((t) => (t % 2 ? t + 1 : t));
      return;
    }
    const id = setInterval(() => setTurns((t) => t + 1), HOLD);
    return () => clearInterval(id);
  }, [hover, animated, only]);

  const angle = only === "neon" ? 180 : only === "glass" ? 0 : turns * 180;
  const showingNeon = Math.round(angle / 180) % 2 === 1;

  return (
    <div
      ref={box}
      role="img"
      aria-label="Oraklo"
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
      {/* brilho atrás: mais forte quando a face neon está à mostra */}
      <div
        aria-hidden
        className="absolute inset-[12%] rounded-full blur-2xl transition-opacity duration-700"
        style={{ background: "color-mix(in srgb, var(--color-neon) 45%, transparent)", opacity: showingNeon ? 1 : 0.6 }}
      />
      <div className="logo-tilt relative size-full">
        <div className="logo-coin relative size-full" style={{ transform: `rotateY(${angle}deg)` }}>
          <div className="logo-face absolute inset-0">
            <LogoGlass className="size-full" />
          </div>
          <div className="logo-face absolute inset-0" style={{ transform: "rotateY(180deg)" }}>
            <LogoNeon color={cores.neon} />
          </div>
        </div>
        {/* faixa de luz que atravessa durante cada giro */}
        {animated && !only && <div key={turns} aria-hidden className="logo-sweep pointer-events-none absolute inset-0" />}
      </div>
    </div>
  );
}
