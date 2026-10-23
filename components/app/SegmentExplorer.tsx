"use client";

import { useEffect, useRef, useState } from "react";
import {
  Truck,
  Warehouse,
  Route,
  Snowflake,
  Package,
  Factory,
  Wheat,
  Store,
  ShoppingCart,
  Stethoscope,
  HardHat,
  Calculator,
  Building2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import type { Niche } from "@/content/app";
import { Aura, Micro, Pill } from "@/components/app/ui";
import { createListFromNiche } from "@/app/(app)/listas/actions";
import { NicheShape, RingVortex } from "@/components/three/lazy";

const icons: Record<string, LucideIcon> = {
  truck: Truck,
  warehouse: Warehouse,
  route: Route,
  snowflake: Snowflake,
  package: Package,
  factory: Factory,
  wheat: Wheat,
  store: Store,
  cart: ShoppingCart,
  health: Stethoscope,
  hardhat: HardHat,
  calc: Calculator,
};

// Cor de cada área, reaproveitando os gradientes do site.
const toneByGroup: Record<string, string> = {
  "Transporte e logística": "lime",
  Indústria: "sun",
  Agro: "mint",
  "Varejo e distribuição": "lilac",
  Saúde: "coral",
  Serviços: "night",
};

const AUTO_SPEED = 7; // graus por segundo
const fmt = (n: number) => n.toLocaleString("pt-BR");

// Anel 3D de nichos: gira sozinho, pausa ao passar o mouse e pré-visualiza o nicho.
// A lista vem do servidor e não muda durante a visita, por isso os efeitos leem N/STEP só na montagem.
type Props = { niches: Niche[]; acimaDoAnel?: React.ReactNode };

// Só aparecem os nichos e atividades que o cliente escolheu no perfil, com números reais da base.
export default function SegmentExplorer({ niches, acimaDoAnel }: Props) {
  if (!niches.length) {
    return (
      <div className="space-y-4">
        {acimaDoAnel}
        <div className="glass no-fx flex flex-col items-start gap-3 p-8">
          <Micro>Seus segmentos</Micro>
          <h2 className="text-3xl font-light tracking-[-0.04em]">Você ainda não escolheu nenhum segmento</h2>
          <p className="max-w-xl text-sm opacity-60">
            Marque abaixo os nichos ou pesquise as atividades que você quer focar. Eles aparecem aqui, com o número de empresas que existem na base.
          </p>
          <a href="#foco" className="mt-2 rounded-full bg-night px-5 py-2.5 text-sm font-medium text-white">
            Escolher segmentos
          </a>
        </div>
      </div>
    );
  }
  return <Anel niches={niches} acimaDoAnel={acimaDoAnel} />;
}

function Anel({ niches, acimaDoAnel }: Props) {
  const N = niches.length;
  const STEP = 360 / N;
  const [group, setGroup] = useState("Todos");
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [frontId, setFrontId] = useState(niches[0].id);
  const [dims, setDims] = useState({ w: 190, h: 250, R: 480 });

  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Estado da animação (fora do React para não re-renderizar a cada quadro).
  const rot = useRef(0);
  const vel = useRef(0);
  const target = useRef<number | null>(null);
  const paused = useRef(false);
  const drag = useRef({ active: false, x: 0, total: 0 });
  const dimsRef = useRef(dims);
  const groupRef = useRef(group);

  useEffect(() => {
    dimsRef.current = dims;
  }, [dims]);
  useEffect(() => {
    groupRef.current = group;
  }, [group]);

  // Tamanho do cartão e raio do anel conforme a largura do palco.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.clientWidth;
      const w = width < 560 ? 150 : 190;
      const h = Math.round(w * 1.3);
      const R = Math.round((w * 1.15) / (2 * Math.tan(Math.PI / N)));
      setDims({ w, h, R });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Laço de animação.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let last = performance.now();

    const apply = () => {
      const ring = ringRef.current;
      if (!ring) return;
      const { R } = dimsRef.current;
      ring.style.transform = `translateZ(${-R}px)`;
      let best = -2;
      let bestI = 0;
      for (let i = 0; i < N; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const a = i * STEP + rot.current;
        const c = Math.cos((a * Math.PI) / 180);
        const g = groupRef.current;
        const inGroup = g === "Todos" || niches[i].group === g;
        el.style.transform = `rotateY(${a}deg) translateZ(${R}px)`;
        el.style.opacity = String(c > 0 ? (0.3 + 0.7 * c) * (inGroup ? 1 : 0.25) : 0);
        el.style.pointerEvents = c > 0.15 ? "auto" : "none";
        if (c > best) {
          best = c;
          bestI = i;
        }
      }
      setFrontId((prev) => (prev === niches[bestI].id ? prev : niches[bestI].id));
    };

    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (!drag.current.active) {
        if (target.current !== null) {
          const diff = target.current - rot.current;
          rot.current += diff * Math.min(1, dt * 5);
          if (Math.abs(diff) < 0.05) {
            rot.current = target.current;
            target.current = null;
          }
        } else {
          const goal = paused.current || reduce ? 0 : AUTO_SPEED;
          vel.current += (goal - vel.current) * Math.min(1, dt * 4);
          rot.current += vel.current * dt;
        }
      }
      apply();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMove = (e: PointerEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.x;
      drag.current.x = e.clientX;
      drag.current.total += Math.abs(dx);
      rot.current += dx * 0.25;
      vel.current = 0;
      target.current = null;
    };
    const onUp = () => {
      drag.current.active = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  // Gira o anel até o cartão `i` ficar de frente (pelo caminho mais curto).
  function bringToFront(i: number) {
    const a = ((((i * STEP + rot.current) % 360) + 360 + 180) % 360) - 180;
    target.current = rot.current - a;
  }

  function step(dir: 1 | -1) {
    const k = Math.round(rot.current / STEP);
    target.current = (k - dir) * STEP;
  }

  function pickGroup(g: string) {
    setGroup(g);
    if (g === "Todos") return;
    const i = niches.findIndex((n) => n.group === g);
    if (i >= 0) bringToFront(i);
  }

  const active = niches.find((n) => n.id === (hoverId ?? frontId)) ?? niches[0];
  const grupos = ["Todos", ...new Set(niches.map((n) => n.group))];
  const ActiveIcon = icons[active.icon] ?? Building2;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Áreas de atuação"
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
      >
        {grupos.map((g) => (
          <button
            key={g}
            role="tab"
            aria-selected={g === group}
            type="button"
            onClick={() => pickGroup(g)}
            className={`min-h-11 shrink-0 cursor-pointer rounded-full border px-5 text-sm transition-colors ${
              g === group
                ? "border-night bg-night font-medium text-white"
                : "border-white/70 bg-white/55 hover:bg-white/90"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_400px] xl:items-start">
        <div className="min-w-0 space-y-4">
        {acimaDoAnel}
        {/* Palco do anel 3D */}
        <div className="glass no-fx relative overflow-hidden">
          {/* vórtice de partículas 3D que gira junto com o anel */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[430px] md:h-[520px]">
            <RingVortex rotation={rot} tone={toneByGroup[active.group] ?? "lime"} />
          </div>
          <div
            ref={stageRef}
            className="relative h-[430px] cursor-grab touch-pan-y select-none active:cursor-grabbing md:h-[520px]"
            style={{ perspective: 1500 }}
            onPointerDown={(e) => {
              drag.current = { active: true, x: e.clientX, total: 0 };
            }}
          >
            {/* chão do anel */}
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-10 left-1/2 h-24 w-[70%] -translate-x-1/2 rounded-[50%] border border-night/15"
            />
            <div
              ref={ringRef}
              role="list"
              aria-label="Nichos de prospecção"
              className="absolute left-1/2 top-1/2 size-0"
              style={{ transformStyle: "preserve-3d" }}
            >
              {niches.map((n, i) => {
                const Icon = icons[n.icon] ?? Building2;
                const tone = toneByGroup[n.group] ?? "lime";
                const dark = tone === "night";
                return (
                  <div
                    key={n.id}
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    role="listitem"
                    className="absolute"
                    style={{
                      width: dims.w,
                      height: dims.h,
                      left: -dims.w / 2,
                      top: -dims.h / 2,
                      backfaceVisibility: "hidden",
                      opacity: 0,
                    }}
                  >
                    <button
                      type="button"
                      aria-label={`${n.name} — ver detalhes`}
                      onPointerEnter={() => {
                        paused.current = true;
                        setHoverId(n.id);
                      }}
                      onPointerLeave={() => {
                        paused.current = false;
                        setHoverId(null);
                      }}
                      onFocus={() => {
                        paused.current = true;
                        setHoverId(n.id);
                      }}
                      onBlur={() => {
                        paused.current = false;
                        setHoverId(null);
                      }}
                      onClick={() => {
                        if (drag.current.total > 6) return;
                        bringToFront(i);
                      }}
                      className={`aura-${tone} no-fx group relative flex size-full cursor-pointer flex-col justify-between overflow-hidden rounded-[24px] border border-white/60 p-4 text-left shadow-[0_24px_40px_-24px_color-mix(in_srgb,var(--color-sombra)_50%,transparent)] transition-transform duration-300 hover:scale-[1.06]`}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`flex size-10 items-center justify-center rounded-full ${
                            dark ? "bg-neon text-night" : "bg-night text-neon"
                          }`}
                        >
                          <Icon size={18} aria-hidden />
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-widest opacity-70">
                          {n.score !== null ? `Fit ${n.score}` : `${fmt(n.companies)} empresas`}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium leading-tight tracking-[-0.03em]">{n.name}</h3>
                        <p className="mt-1 flex items-center gap-1 text-[11px] opacity-70">
                          <MapPin size={10} aria-hidden /> {n.region}
                        </p>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative flex items-center justify-between gap-3 border-t border-night/10 px-4 py-3">
            <Micro>Arraste para girar · passe o mouse para pré-visualizar</Micro>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Nicho anterior"
                onClick={() => step(-1)}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-night/10 bg-white/70 hover:bg-night hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Próximo nicho"
                onClick={() => step(1)}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-night/10 bg-white/70 hover:bg-night hover:text-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
        </div>

        {/* Pré-visualização do nicho */}
        <Aura tone="night" className="h-fit p-7 xl:sticky xl:top-4">
          <div aria-live="polite" className="relative">
            {/* forma 3D do nicho: muda a cada nicho, reage ao mouse */}
            <div aria-hidden className="relative -mx-7 -mt-7 mb-1">
              <NicheShape icon={active.icon} />
              <span className="absolute left-7 top-7 flex size-12 items-center justify-center rounded-full bg-neon text-night">
                <ActiveIcon size={22} aria-hidden />
              </span>
            </div>
            <Micro className="relative mt-5 !opacity-60">{active.group}</Micro>
            <h2 className="relative mt-3 max-w-[18rem] text-4xl font-medium leading-[1] tracking-[-0.045em]">
              {active.name}
            </h2>
            <p className="relative mt-4 text-sm leading-relaxed opacity-65">{active.description}</p>
            {active.score !== null && (
              <>
                <p className="relative mt-8 text-8xl font-light leading-none tracking-[-0.06em] text-neon">{active.score}</p>
                <Micro className="relative mt-2 !opacity-60">Índice de fit</Micro>
              </>
            )}

            <dl className={`relative mt-6 grid gap-px overflow-hidden rounded-2xl bg-white/10 ${active.contacts > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
              {[
                { l: active.atividade || active.preview ? "Empresas na base" : "Empresas", v: fmt(active.companies) },
                ...(active.contacts > 0 ? [{ l: "Contatos", v: fmt(active.contacts) }] : []),
              ].map(({ l, v }) => (
                <div key={l} className="bg-night/70 p-4">
                  <dd className="text-2xl font-light tracking-[-0.04em]">{v}</dd>
                  <dt className="font-mono text-[10px] uppercase tracking-widest opacity-50">{l}</dt>
                </div>
              ))}
            </dl>

            {active.roles.length > 0 && (
              <>
                <Micro className="relative mt-7 !opacity-60">Decisores mais comuns</Micro>
                <ul className="relative mt-3 flex flex-wrap gap-2">
                  {active.roles.map((r) => (
                    <li key={r} className="rounded-full border border-white/20 px-3 py-1 text-xs">
                      {r}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {active.samples.length > 0 && (
              <>
                <Micro className="relative mt-7 !opacity-60">Exemplos de empresas</Micro>
                <ul className="relative mt-2 divide-y divide-white/10 text-sm">
                  {active.samples.map((s, i) => (
                    <li key={s} className="flex items-center gap-3 py-3">
                      <span className="font-mono text-[10px] text-neon">{String(i + 1).padStart(2, "0")}</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <ul className="relative mt-5 flex flex-wrap gap-2">
              {active.tags.map((t) => (
                <li key={t} className="font-mono text-[10px] uppercase tracking-widest opacity-50">
                  #{t}
                </li>
              ))}
            </ul>

            {active.preview || active.atividade ? (
              <div className="relative mt-7">
                <Pill href="/busca-avancada" tone="neon" className="w-full justify-between">
                  Buscar empresas deste segmento
                </Pill>
              </div>
            ) : (
              <form action={createListFromNiche} className="relative mt-7">
                <input type="hidden" name="niche" value={active.id} />
                <Pill type="submit" tone="neon" className="w-full justify-between">
                  Criar lista deste nicho
                </Pill>
              </form>
            )}
          </div>
        </Aura>
      </div>
    </div>
  );
}
