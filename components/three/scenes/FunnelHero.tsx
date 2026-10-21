"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Stage from "../Stage";
import ParticleField from "../ParticleField";
import { cloud, funnel, sphere, wave } from "@/lib/three/shapes";
import { Micro } from "@/components/app/ui";

type Step = { label: string; value: number; pct: number };

const CAPTIONS = [
  "Toda a base captada: uma nuvem de oportunidades.",
  "O funil filtra quem foi abordado pelas sequências.",
  "Quem respondeu entra na onda da conversa.",
  "Reuniões: os leads que convergiram.",
];
const CYCLE = 4800;

// Hero da Visão geral: as partículas desenham o funil com os números reais
// e se transformam a cada etapa (automático, ou ao passar o mouse/clicar na etapa).
export default function FunnelHero({ steps }: { steps: Step[] }) {
  const [active, setActive] = useState(0);
  const [hold, setHold] = useState(false);
  const morph = useRef(0);

  const n = typeof window !== "undefined" && window.innerWidth < 768 ? 4500 : 10000;
  const shapes = useMemo(
    () => [cloud(n, 2.1), funnel(n, steps.map((s) => s.value)), wave(n, 5, 2.6), sphere(n, 1.45)],
    [n, steps],
  );

  useEffect(() => {
    morph.current = active;
  }, [active]);

  useEffect(() => {
    if (hold || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setActive((a) => (a + 1) % steps.length), CYCLE);
    return () => clearInterval(id);
  }, [hold, steps.length]);

  const step = steps[active];

  return (
    <section
      aria-label="Funil de prospecção em 3D"
      className="relative overflow-hidden rounded-[28px] bg-night text-white"
      onPointerEnter={() => setHold(true)}
      onPointerLeave={() => setHold(false)}
    >
      {/* brilho de fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 70% at 70% 40%, rgba(184,255,60,0.16), transparent 70%), radial-gradient(50% 60% at 0% 100%, rgba(120,140,255,0.14), transparent 70%)",
        }}
      />
      <Stage
        className="h-[520px] md:h-[600px]"
        camera={{ position: [0, 0, 7.2], fov: 38 }}
        shift={0.2}
        overlay={
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-6 md:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Micro className="!opacity-60">Funil 3D · últimos 30 dias</Micro>
                <p key={active} className="mask-up mt-5 text-7xl font-light leading-none tracking-[-0.06em] text-neon md:text-[9rem]">
                  {step.value.toLocaleString("pt-BR")}
                </p>
                <p key={`l${active}`} className="reveal mt-3 text-2xl font-medium tracking-[-0.03em] md:text-3xl">
                  {step.label}
                  <span className="ml-3 align-middle font-mono text-xs text-white/50">{step.pct}% da base</span>
                </p>
                <p key={`c${active}`} className="reveal mt-2 max-w-sm text-sm text-white/55">
                  {CAPTIONS[active]}
                </p>
              </div>
              <Micro className="hidden !opacity-50 md:block">Mova o mouse sobre as partículas</Micro>
            </div>

            <ol className="pointer-events-auto grid grid-cols-2 gap-2 md:max-w-xl md:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.label}>
                  <button
                    type="button"
                    onPointerEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-pressed={i === active}
                    className={`group relative w-full cursor-pointer overflow-hidden rounded-2xl border px-4 py-3 text-left transition-colors duration-300 ${
                      i === active ? "border-neon bg-neon text-night" : "border-white/15 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="block font-mono text-[10px] uppercase tracking-widest opacity-60">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block text-lg font-light tabular-nums tracking-[-0.03em]">
                      {s.value.toLocaleString("pt-BR")}
                    </span>
                    {/* barra de progresso do ciclo automático */}
                    {i === active && !hold && (
                      <span
                        aria-hidden
                        className="absolute bottom-0 left-0 h-[3px] bg-night/60"
                        style={{ animation: `cycle-bar ${CYCLE}ms linear both` }}
                      />
                    )}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        }
      >
        <ParticleField shapes={shapes} morph={morph} size={30} mouseForce={0.7} mouseRadius={1.1} spin={0.08} />
      </Stage>
    </section>
  );
}
