"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Building2,
  Calculator,
  Check,
  Factory,
  HardHat,
  Loader2,
  Package,
  RotateCcw,
  Route,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Stethoscope,
  Store,
  Truck,
  Warehouse,
  Wheat,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Niche } from "@/content/app";
import { Glass, Micro } from "@/components/app/ui";
import { SIZE_LABEL } from "@/lib/format";
import { cnaesDoPerfil, forcaDoPerfil, type PerfilBusca } from "@/lib/perfil-busca";
import { esquecerAprendizado, salvarPerfil } from "@/app/(app)/segmentacao/perfil";

const ICONES: Record<string, LucideIcon> = {
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
const CAPITAIS = [
  { v: null, t: "Qualquer" },
  { v: 10_000, t: "R$ 10 mil+" },
  { v: 100_000, t: "R$ 100 mil+" },
  { v: 1_000_000, t: "R$ 1 mi+" },
];
const ANOS = [
  { v: null, t: "Qualquer" },
  { v: 2, t: "2+ anos" },
  { v: 5, t: "5+ anos" },
  { v: 10, t: "10+ anos" },
];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-xs font-medium transition-colors ${on ? "border-night bg-night text-white" : "border-white/80 bg-white/70 hover:border-night/20 hover:bg-white"}`}
    >
      {on && <Check size={12} aria-hidden className="text-neon" />}
      {children}
    </button>
  );
}

/** "Quais nichos você deseja focar?" + preferências que deixam a Busca avançada mais certeira. */
export default function FocoNichos({ niches, inicial }: { niches: Niche[]; inicial: PerfilBusca }) {
  const [p, setP] = useState<PerfilBusca>(inicial);
  const [estado, setEstado] = useState<"ok" | "salvando" | "erro">("ok");
  const ultimo = useRef(JSON.stringify(inicial));
  const forca = forcaDoPerfil(p);
  const grupos = useMemo(() => [...new Set(niches.map((n) => n.group))], [niches]);
  const a = p.aprendizado;

  // salva sozinho (sem o aprendizado, que é do servidor)
  useEffect(() => {
    const atual = JSON.stringify(p);
    if (atual === ultimo.current) return;
    setEstado("salvando");
    const t = setTimeout(() => {
      const { aprendizado: _a, ...prefs } = p;
      void _a;
      salvarPerfil(prefs)
        .then((salvo) => {
          ultimo.current = JSON.stringify({ ...p, atualizadoEm: salvo.atualizadoEm });
          setP((s) => ({ ...s, atualizadoEm: salvo.atualizadoEm }));
          setEstado("ok");
        })
        .catch(() => setEstado("erro"));
    }, 900);
    return () => clearTimeout(t);
  }, [p]);

  const alternar = <K extends "nichos" | "portes">(k: K, v: string) =>
    setP((s) => ({ ...s, [k]: s[k].includes(v) ? s[k].filter((x) => x !== v) : [...s[k], v] }));

  const topo = (m: Record<string, number>, n = 3) =>
    Object.entries(m)
      .filter(([, v]) => v > 0)
      .sort((x, y) => y[1] - x[1])
      .slice(0, n)
      .map(([k]) => k);
  const nomeNichoPorCnae = (code: string) => niches.find((n) => cnaesDoPerfil({ ...p, nichos: [n.id] }).includes(code))?.name ?? `CNAE ${code}`;

  return (
    <section aria-label="Foco e perfil de cliente ideal" className="mt-4 space-y-4">
      <div id="foco">
        {/* nichos */}
        <Glass className="scroll-mt-28 p-6 md:p-8">
          <Micro>Seu foco</Micro>
          <h2 className="mt-3 text-4xl font-light leading-[1.05] tracking-[-0.04em] md:text-5xl">Quais nichos você deseja focar?</h2>
          <p className="mt-3 max-w-xl text-sm opacity-60">Escolha um ou mais. A Busca avançada já abre com as atividades (CNAE) desses nichos e coloca primeiro as empresas que mais combinam com você.</p>

          <div className="mt-6 space-y-5">
            {grupos.map((g) => (
              <div key={g}>
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-45">{g}</p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {niches
                    .filter((n) => n.group === g)
                    .map((n) => {
                      const on = p.nichos.includes(n.id);
                      const Icone = ICONES[n.icon] ?? Building2;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          aria-pressed={on}
                          onClick={() => alternar("nichos", n.id)}
                          className={`group flex min-h-16 cursor-pointer items-center gap-3 rounded-[20px] border p-3 text-left transition-all duration-300 ${
                            on ? "border-night bg-night text-white shadow-[0_18px_40px_-22px_rgba(10,10,10,0.8)]" : "border-white/80 bg-white/60 hover:-translate-y-0.5 hover:bg-white"
                          }`}
                        >
                          <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl transition-colors ${on ? "bg-neon text-night" : "bg-night/5 group-hover:bg-night group-hover:text-neon"}`}>
                            <Icone size={18} aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium leading-tight">{n.name}</span>
                            <span className={`block truncate text-[11px] ${on ? "text-white/55" : "opacity-55"}`}>
                              {n.region}
                              {n.preview ? " · prévia" : ` · ${n.companies.toLocaleString("pt-BR")} empresas`}
                            </span>
                          </span>
                          <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors ${on ? "border-neon bg-neon text-night" : "border-night/20"}`}>
                            {on && <Check size={13} />}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </Glass>

      </div>

      {/* aprimorar */}
      <Glass className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <Micro>Aprimorar busca</Micro>
            <h2 className="mt-3 text-3xl font-light tracking-[-0.04em] md:text-4xl">Como é o seu cliente ideal?</h2>
            <p className="mt-2 max-w-xl text-sm opacity-60">Essas escolhas viram filtros e ordem dos resultados na Busca avançada. Salva sozinho.</p>
          </div>
          <div className="min-w-[220px]">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">Força do perfil</span>
              <span className="text-2xl font-light tracking-[-0.04em] tabular-nums">
                {forca.feitos}/{forca.total}
              </span>
            </div>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: forca.total }, (_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < forca.feitos ? "bg-night" : "bg-night/10"}`} />
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] opacity-60">
              {estado === "salvando" ? <Loader2 size={11} className="animate-spin" /> : estado === "ok" ? <Check size={11} className="text-emerald-600" /> : <X size={11} className="text-rose-600" />}
              {estado === "salvando" ? "Salvando…" : estado === "ok" ? "Perfil salvo" : "Não foi possível salvar"}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <fieldset>
            <legend className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">Porte das empresas</legend>
            <div className="flex flex-wrap gap-2">
              {(["ME", "EPP", "DEMAIS"] as const).map((s) => (
                <Chip key={s} on={p.portes.includes(s)} onClick={() => alternar("portes", s)}>
                  {SIZE_LABEL[s]}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">Capital social mínimo</legend>
            <div className="flex flex-wrap gap-2">
              {CAPITAIS.map((c) => (
                <Chip key={c.t} on={p.capitalMin === c.v} onClick={() => setP((s) => ({ ...s, capitalMin: c.v }))}>
                  {c.t}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">Tempo de mercado</legend>
            <div className="flex flex-wrap gap-2">
              {ANOS.map((c) => (
                <Chip key={c.t} on={p.anosMin === c.v} onClick={() => setP((s) => ({ ...s, anosMin: c.v }))}>
                  {c.t}
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">Contato e estrutura</legend>
            <div className="flex flex-wrap gap-2">
              <Chip on={p.temEmail} onClick={() => setP((s) => ({ ...s, temEmail: !s.temEmail }))}>
                Tem e-mail
              </Chip>
              <Chip on={p.temWhatsapp} onClick={() => setP((s) => ({ ...s, temWhatsapp: !s.temWhatsapp }))}>
                Tem WhatsApp
              </Chip>
              <Chip on={p.soMatriz} onClick={() => setP((s) => ({ ...s, soMatriz: !s.soMatriz }))}>
                Só matriz
              </Chip>
            </div>
          </fieldset>
        </div>

        {/* aprendizado */}
        <div className="mt-8 grid gap-4 rounded-[24px] bg-night p-5 text-white md:grid-cols-[auto_1fr_auto] md:items-center md:p-6">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-neon text-night">
            <Brain size={22} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-medium">O que a busca já aprendeu</p>
            {a.sinais ? (
              <p className="mt-1 text-sm text-white/60">
                {a.sinais} empresa{a.sinais > 1 ? "s" : ""} avaliada{a.sinais > 1 ? "s" : ""}.
                {topo(a.cnaes).length ? ` Gosta de: ${topo(a.cnaes).map(nomeNichoPorCnae).join(", ")}.` : ""}
                {topo(a.portes, 2).length ? ` Porte preferido: ${topo(a.portes, 2).map((s) => SIZE_LABEL[s] ?? s).join(", ")}.` : ""}
              </p>
            ) : (
              <p className="mt-1 text-sm text-white/60">Ainda nada. Na Busca avançada, marque 👍 nas empresas que são seu cliente e 👎 nas que não são — os próximos resultados se ajustam.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {a.sinais > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("Esquecer tudo o que a busca aprendeu?")) return;
                  const novo = await esquecerAprendizado();
                  ultimo.current = JSON.stringify(novo);
                  setP(novo);
                }}
                className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-white/15 px-4 text-xs text-white/70 hover:bg-white/10"
              >
                <RotateCcw size={12} aria-hidden /> Esquecer
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <span className="relative inline-flex items-center">
              <input type="checkbox" className="peer sr-only" checked={p.ativo} onChange={(e) => setP((s) => ({ ...s, ativo: e.target.checked }))} />
              <span className="h-6 w-11 rounded-full bg-night/15 transition-colors peer-checked:bg-night" />
              <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 peer-checked:bg-neon" />
            </span>
            Aplicar meu perfil automaticamente na Busca avançada
          </label>
          <Link href="/busca-avancada" className="group flex min-h-12 items-center gap-3 rounded-full bg-night py-1.5 pl-6 pr-1.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">
            <Sparkles size={15} aria-hidden className="text-neon" /> Buscar com meu perfil
            <span className="flex size-9 items-center justify-center rounded-full bg-neon text-night transition-transform group-hover:translate-x-0.5">
              <ArrowRight size={16} aria-hidden />
            </span>
          </Link>
        </div>
      </Glass>
    </section>
  );
}
