"use client";

import { useEffect, useRef } from "react";
import { Building2, Mail, Truck, TrendingUp, Zap } from "lucide-react";

/*
 * Cartões flutuando em volta do título (como as fotos na intro da Higgsfield),
 * mas com o conteúdo do Oraklo. Cada um tem 3 camadas de movimento que não brigam:
 *  1. entrada (voa de fora, `fly-in`)        → propriedade `scale`/`opacity`
 *  2. paralaxe com o mouse (profundidade)     → propriedade `translate`
 *  3. flutuação contínua + inclinação         → `transform` (keyframes `bob`)
 */

type Item = {
  x: string; // posição (left %) no desktop
  y: string; // posição (top %)
  depth: number; // quanto anda com o mouse
  tilt: number; // graus
  delay: number;
  hideMobile?: boolean;
  node: React.ReactNode;
};

const glassDark = "rounded-[22px] border border-white/15 bg-white/[0.06] p-4 text-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-xl";

function Sphere({ size, from, to }: { size: number; from: string; to: string }) {
  return (
    <span
      className="block rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 28%, #fff 0%, ${from} 22%, ${to} 70%, #050505 100%)`,
        boxShadow: `0 0 60px -10px ${from}`,
      }}
    />
  );
}

const ITEMS: Item[] = [
  {
    x: "6%",
    y: "13%",
    depth: 34,
    tilt: -8,
    delay: 0.15,
    node: (
      <div className={`${glassDark} w-56`}>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-neon font-mono text-xs text-night">JR</span>
          <div>
            <p className="text-sm font-medium">Juliana Rocha</p>
            <p className="text-[11px] text-white/55">Dir. operações · Rota Sul</p>
          </div>
        </div>
        <p className="mt-3 flex w-fit items-center gap-2 rounded-full bg-neon/15 px-3 py-1 text-[11px] text-neon">
          <span className="size-1.5 rounded-full bg-neon" /> Reunião marcada
        </p>
      </div>
    ),
  },
  {
    x: "14%",
    y: "58%",
    depth: 22,
    tilt: 6,
    delay: 0.35,
    hideMobile: true,
    node: (
      <div className="aura-lime w-44 rounded-[22px] p-4 text-night shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]">
        <span className="flex size-9 items-center justify-center rounded-full bg-night text-neon">
          <Truck size={16} aria-hidden />
        </span>
        <p className="mt-6 text-base font-medium leading-tight tracking-[-0.03em]">Transportadoras em SC</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest opacity-70">Fit 88</p>
      </div>
    ),
  },
  {
    x: "77%",
    y: "16%",
    depth: 40,
    tilt: 7,
    delay: 0.25,
    node: (
      <div className="aura-sun w-48 rounded-[22px] p-4 text-night shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]">
        <p className="font-mono text-[10px] uppercase tracking-widest opacity-70">Taxa de resposta</p>
        <p className="mt-3 text-5xl font-light tracking-[-0.06em]">17,3%</p>
        <p className="mt-1 flex items-center gap-1 font-mono text-[11px]">
          <TrendingUp size={12} aria-hidden /> +2,1 pp
        </p>
      </div>
    ),
  },
  {
    x: "84%",
    y: "52%",
    depth: 26,
    tilt: -6,
    delay: 0.45,
    hideMobile: true,
    node: (
      <div className={`${glassDark} w-52`}>
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-white text-night">
            <Mail size={14} aria-hidden />
          </span>
          <p className="text-xs text-white/70">Sequência “Outbound logística”</p>
        </div>
        <div className="mt-3 space-y-1.5">
          {["E-mail 1 · aberto", "E-mail 2 · respondeu"].map((s, i) => (
            <p key={s} className="flex items-center gap-2 text-[11px]">
              <span className={`size-1.5 rounded-full ${i ? "bg-neon" : "bg-white/40"}`} /> {s}
            </p>
          ))}
        </div>
      </div>
    ),
  },
  {
    x: "70%",
    y: "74%",
    depth: 18,
    tilt: 4,
    delay: 0.55,
    hideMobile: true,
    node: (
      <div className="aura-lilac flex w-44 items-center gap-3 rounded-[22px] p-4 text-night shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]">
        <span className="flex size-9 items-center justify-center rounded-full bg-night text-white">
          <Building2 size={15} aria-hidden />
        </span>
        <div>
          <p className="text-xl font-light tracking-[-0.04em]">1.840</p>
          <p className="font-mono text-[10px] uppercase tracking-widest opacity-70">Empresas</p>
        </div>
      </div>
    ),
  },
  // esferas brilhantes e raio neon, como os objetos soltos da referência
  { x: "66%", y: "7%", depth: 60, tilt: 0, delay: 0.6, node: <Sphere size={46} from="#d4d4d8" to="#3f3f46" /> },
  { x: "79%", y: "40%", depth: 70, tilt: 0, delay: 0.7, hideMobile: true, node: <Sphere size={78} from="#5eead4" to="#065f46" /> },
  { x: "25%", y: "80%", depth: 55, tilt: 0, delay: 0.75, hideMobile: true, node: <Sphere size={58} from="#d9f99d" to="#4d7c0f" /> },
  {
    x: "88%",
    y: "33%",
    depth: 50,
    tilt: 14,
    delay: 0.8,
    node: <Zap size={44} aria-hidden className="fill-neon text-neon drop-shadow-[0_0_18px_rgba(184,255,60,0.7)]" />,
  },
];

export default function FloatingCards() {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const move = (e: PointerEvent) => {
      tx = e.clientX / innerWidth - 0.5;
      ty = e.clientY / innerHeight - 0.5;
    };
    const tick = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.setProperty("--px", x.toFixed(4));
      el.style.setProperty("--py", y.toFixed(4));
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={box} aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {ITEMS.map((it, i) => (
        <div
          key={i}
          className={`fly-in absolute ${it.hideMobile ? "hidden md:block" : ""}`}
          style={{
            left: it.x,
            top: it.y,
            animationDelay: `${0.9 + it.delay}s`,
            translate: `calc(var(--px, 0) * ${-it.depth}px) calc(var(--py, 0) * ${-it.depth}px)`,
          }}
        >
          <div className="bob" style={{ ["--tilt" as string]: `${it.tilt}deg`, animationDelay: `${-i * 0.9}s`, animationDuration: `${6 + (i % 3)}s` }}>
            {it.node}
          </div>
        </div>
      ))}
    </div>
  );
}
