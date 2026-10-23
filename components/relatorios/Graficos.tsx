import { corCss } from "@/lib/colors";
import type { Balde } from "@/lib/relatorios";
import { BLOCOS, DIAS_SEMANA } from "@/lib/relatorios";

// Gráficos do relatório em SVG/HTML puro (renderizados no servidor, sem biblioteca).

const SERIES = [
  { k: "contatados", t: "Contatados", cor: corCss("night", 0.16) },
  { k: "respostas", t: "Respostas", cor: corCss("night") },
  { k: "reunioes", t: "Reuniões", cor: corCss("neon") },
] as const;

/** Barras agrupadas por dia/semana: contatados, respostas e reuniões. */
export function GraficoAtividade({ serie }: { serie: Balde[] }) {
  const max = Math.max(4, ...serie.flatMap((b) => [b.contatados, b.respostas, b.reunioes]));
  const linhas = [0.25, 0.5, 0.75, 1];
  const mostrarRotulo = (i: number) => serie.length <= 14 || i % Math.ceil(serie.length / 12) === 0 || i === serie.length - 1;
  return (
    <div>
      <div className="flex flex-wrap gap-4">
        {SERIES.map((s) => (
          <span key={s.k} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 rounded-full ring-1 ring-night/15" style={{ background: s.cor }} />
            {s.t}
          </span>
        ))}
      </div>
      <div className="relative mt-5 h-56 pl-8">
        {linhas.map((g) => (
          <div key={g} aria-hidden className="pointer-events-none absolute inset-x-0 flex items-center" style={{ bottom: `${g * 100}%` }}>
            <span className="w-8 pr-2 text-right font-mono text-[9px] opacity-40">{Math.round(max * g)}</span>
            <span className="h-px flex-1 border-t border-dashed border-night/10" />
          </div>
        ))}
        <ul className="relative flex h-full items-end gap-1.5">
          {serie.map((b, i) => (
            <li key={i} className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[3px] rounded-t-xl transition-colors hover:bg-night/[0.03]" title={`${b.rotulo}: ${b.contatados} contatados · ${b.respostas} respostas · ${b.reunioes} reuniões`}>
              {SERIES.map((s) => (
                <span
                  key={s.k}
                  className="barra-sobe w-full max-w-5 rounded-t-full"
                  style={{ height: `${b[s.k] ? Math.max(3, (b[s.k] / max) * 100) : 0}%`, background: s.cor, animationDelay: `${i * 25}ms` }}
                />
              ))}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-2 flex gap-1.5 pl-8">
        {serie.map((b, i) => (
          <span key={i} className="min-w-0 flex-1 truncate text-center font-mono text-[9px] uppercase tracking-wider opacity-45">
            {mostrarRotulo(i) ? b.rotulo : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Mapa de calor dia da semana × faixa de horário (aberturas, cliques e respostas). */
export function MapaHorarios({ mapa }: { mapa: number[][] }) {
  const max = Math.max(1, ...mapa.flat());
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-1 text-center">
        <thead>
          <tr>
            <th className="w-10" />
            {BLOCOS.map((b) => (
              <th key={b} scope="col" className="font-mono text-[9px] font-normal uppercase tracking-wider opacity-45">
                {b}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {mapa.map((linha, d) => (
            <tr key={d}>
              <th scope="row" className="pr-1 text-left font-mono text-[10px] font-normal opacity-55">
                {DIAS_SEMANA[d]}
              </th>
              {linha.map((v, b) => {
                const t = v / max;
                return (
                  <td key={b} title={`${DIAS_SEMANA[d]} ${BLOCOS[b]}: ${v}`} className="h-7 rounded-md" style={{ background: v ? corCss("neon", 0.15 + t * 0.85) : corCss("night", 0.05), boxShadow: t > 0.85 ? `inset 0 0 0 1px ${corCss("night")}` : undefined }} />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
