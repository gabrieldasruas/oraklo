"use client";

import { cores } from "@/lib/colors";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { formatMoney, SIZE_LABEL } from "@/lib/format";
import { Micro } from "@/components/app/ui";

// Capital social das empresas da página, em barras (leve, sem 3D).
// Escala logarítmica: uma empresa gigante não achata as outras.

export type CompanyBar = { cnpj: string; name: string; shareCapital: number | null; size: string; place: string };

const COR: Record<string, string> = { ME: cores["porte-me"], EPP: cores["porte-epp"], DEMAIS: cores["porte-demais"] };
const PORTES = ["ME", "EPP", "DEMAIS"];
const MARCAS = [1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
const curto = (v: number) =>
  v >= 1e9 ? `R$ ${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} bi` : v >= 1e6 ? `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi` : v >= 1e3 ? `R$ ${Math.round(v / 1e3)} mil` : `R$ ${v}`;

export default function CapitalChart({ companies, total }: { companies: CompanyBar[]; total: number }) {
  const router = useRouter();
  const [foco, setFoco] = useState<number | null>(null);
  const [porte, setPorte] = useState<string | null>(null);

  const barras = useMemo(() => [...companies].sort((a, b) => (b.shareCapital ?? 0) - (a.shareCapital ?? 0)), [companies]);
  const valores = barras.map((c) => c.shareCapital ?? 0);
  const max = Math.max(...valores, 1e4);
  const positivos = valores.filter((v) => v > 0);
  const piso = Math.pow(10, Math.floor(Math.log10(Math.min(...positivos, max)))) / 2;
  const topo = Math.log10(max) - Math.log10(piso);
  const altura = (v: number) => Math.max(2, ((Math.log10(Math.max(v, piso)) - Math.log10(piso)) / topo) * 100);
  const ordenados = [...valores].sort((a, b) => a - b);
  const mediana = ordenados.length ? ordenados[Math.floor(ordenados.length / 2)] : 0;
  const soma = valores.reduce((s, v) => s + v, 0);
  const marcas = MARCAS.filter((m) => m <= max && m > piso);
  const atual = foco !== null ? barras[foco] : null;

  return (
    <section aria-label="Capital social das empresas encontradas" className="glass relative overflow-hidden p-6 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Micro>Empresas encontradas</Micro>
          <p className="mt-3 text-6xl font-light leading-none tracking-[-0.06em] tabular-nums">{total.toLocaleString("pt-BR")}</p>
          <p className="mt-2 max-w-md text-sm opacity-55">
            {companies.length ? `Capital social das ${companies.length} empresas desta página. Passe o mouse para ver e clique para abrir.` : "Nenhuma empresa com esses filtros."}
          </p>
        </div>
        {atual && foco !== null ? (
          <div className="previa-in flex min-h-[74px] w-full max-w-[460px] items-center gap-4 rounded-2xl bg-night px-5 py-3 text-white">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: COR[atual.size] ?? cores["score-frio"] }} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-[9px] uppercase tracking-widest text-white/50">
                #{foco + 1} · {SIZE_LABEL[atual.size] ?? "Porte não informado"} · {atual.place || "—"}
              </p>
              <p className="truncate font-medium leading-tight">{atual.name}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xl font-light tracking-[-0.04em] text-neon tabular-nums">{curto(atual.shareCapital ?? 0)}</p>
              <p className="flex items-center justify-end gap-1 text-[10px] text-white/50">
                abrir <ArrowUpRight size={10} aria-hidden />
              </p>
            </div>
          </div>
        ) : companies.length > 0 && (
          <dl className="grid min-h-[74px] grid-cols-3 gap-2">
            {[
              { t: "Maior capital", v: curto(max) },
              { t: "Mediana", v: curto(mediana) },
              { t: "Soma na página", v: curto(soma) },
            ].map((s) => (
              <div key={s.t} className="rounded-2xl border border-white/80 bg-white/60 px-4 py-3">
                <dt className="font-mono text-[9px] uppercase tracking-widest opacity-50">{s.t}</dt>
                <dd className="mt-1 text-lg font-light tracking-[-0.03em] tabular-nums">{s.v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {companies.length > 0 && (
        <>
          {/* gráfico */}
          <div className="relative mt-8 h-52 pl-14" onMouseLeave={() => setFoco(null)}>
            {/* linhas de referência (log) */}
            {marcas.map((m) => (
              <div key={m} aria-hidden className="pointer-events-none absolute inset-x-0 flex items-center" style={{ bottom: `${altura(m)}%` }}>
                <span className="w-14 pr-2 text-right font-mono text-[9px] opacity-40">{curto(m).replace("R$ ", "")}</span>
                <span className="h-px flex-1 border-t border-dashed border-night/10" />
              </div>
            ))}

            <ul className="relative flex h-full items-end gap-1">
              {barras.map((c, i) => {
                const apagada = (porte && porte !== c.size) || (foco !== null && foco !== i);
                return (
                  <li key={c.cnpj} className="flex h-full min-w-0 flex-1 items-end">
                    <button
                      type="button"
                      aria-label={`${c.name}: ${formatMoney(c.shareCapital)}`}
                      onMouseEnter={() => setFoco(i)}
                      onFocus={() => setFoco(i)}
                      onBlur={() => setFoco(null)}
                      onClick={() => router.push(`/empresas/${c.cnpj}`)}
                      className="barra-sobe group relative w-full cursor-pointer overflow-hidden rounded-t-full transition-[opacity,background-color] duration-200"
                      style={{
                        height: `${altura(c.shareCapital ?? 0)}%`,
                        animationDelay: `${i * 14}ms`,
                        background: foco === i ? cores.night : "color-mix(in srgb, var(--color-night) 13%, transparent)",
                        opacity: apagada ? 0.35 : 1,
                      }}
                    >
                      <span aria-hidden className="absolute inset-x-0 top-0 h-1.5" style={{ background: COR[c.size] ?? cores["score-frio"] }} />
                    </button>
                  </li>
                );
              })}
            </ul>

          </div>

          {/* legenda por porte */}
          <ul className="mt-5 flex flex-wrap gap-2">
            {PORTES.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseEnter={() => setPorte(s)}
                  onMouseLeave={() => setPorte(null)}
                  onFocus={() => setPorte(s)}
                  onBlur={() => setPorte(null)}
                  className={`flex min-h-9 cursor-default items-center gap-2 rounded-full border px-4 text-xs transition-colors ${porte === s ? "border-night bg-night text-white" : "border-white/80 bg-white/70"}`}
                >
                  <span className="size-2 rounded-full" style={{ background: COR[s] }} />
                  {SIZE_LABEL[s]}
                  <span className="font-mono opacity-50">{companies.filter((c) => c.size === s).length}</span>
                </button>
              </li>
            ))}
            <li className="ml-auto self-center font-mono text-[10px] uppercase tracking-widest opacity-40">Escala logarítmica</li>
          </ul>
        </>
      )}
    </section>
  );
}
