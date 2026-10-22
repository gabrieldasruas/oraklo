"use client";

import { useState } from "react";
import type { Grupo } from "@/lib/relatorios";

const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const fmt = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** Desempenho por segmento, cidade e porte (abas). */
export default function Agrupamentos({ segmentos, cidades, portes }: { segmentos: Grupo[]; cidades: Grupo[]; portes: Grupo[] }) {
  const abas = [
    { k: "segmento", t: "Segmento", g: segmentos },
    { k: "cidade", t: "Cidade", g: cidades },
    { k: "porte", t: "Porte", g: portes },
  ] as const;
  const [aba, setAba] = useState<(typeof abas)[number]["k"]>("segmento");
  const grupos = abas.find((a) => a.k === aba)!.g;
  const maxLeads = Math.max(1, ...grupos.map((g) => g.leads));
  const melhor = [...grupos].filter((g) => g.leads >= 3).sort((a, b) => pct(b.respostas, b.leads) - pct(a.respostas, a.leads))[0];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" className="flex gap-1 rounded-full bg-night/5 p-1 print:hidden">
          {abas.map((a) => (
            <button
              key={a.k}
              type="button"
              role="tab"
              aria-selected={aba === a.k}
              onClick={() => setAba(a.k)}
              className={`min-h-9 cursor-pointer rounded-full px-4 text-xs font-medium transition-colors ${aba === a.k ? "bg-night text-white" : "hover:bg-white"}`}
            >
              {a.t}
            </button>
          ))}
        </div>
        {melhor && (
          <p className="text-xs">
            <span className="opacity-55">Melhor resposta:</span> <span className="font-medium">{melhor.nome}</span>{" "}
            <span className="rounded-full bg-neon px-2 py-0.5 font-mono text-[10px]">{fmt(pct(melhor.respostas, melhor.leads))}</span>
          </p>
        )}
      </div>

      {grupos.length ? (
        <ul className="mt-4 divide-y divide-night/10">
          <li className="hidden grid-cols-[1.6fr_2fr_70px_90px_90px] gap-4 pb-3 font-mono text-[9px] uppercase tracking-widest opacity-45 md:grid">
            <span>{abas.find((a) => a.k === aba)!.t}</span>
            <span>Leads</span>
            <span className="text-right">Qtd.</span>
            <span className="text-right">Resposta</span>
            <span className="text-right">Reunião</span>
          </li>
          {grupos.map((g) => (
            <li key={g.nome} className="grid items-center gap-x-4 gap-y-2 py-4 md:grid-cols-[1.6fr_2fr_70px_90px_90px]">
              <span className="truncate font-medium tracking-[-0.01em]" title={g.nome}>
                {g.nome}
              </span>
              <div className="relative h-px bg-night/15">
                <div className="absolute inset-y-0 left-0 h-[3px] -translate-y-px rounded-full bg-night" style={{ width: `${(g.leads / maxLeads) * 100}%` }} />
              </div>
              <span className="font-mono text-xs tabular-nums opacity-60 md:text-right">{g.leads}</span>
              <span className="text-sm tabular-nums md:text-right">{fmt(pct(g.respostas, g.leads))}</span>
              <span className="md:text-right">
                <span className="rounded-full bg-night px-2.5 py-1 font-mono text-[11px] text-neon tabular-nums">{fmt(pct(g.reunioes, g.leads))}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm opacity-60">Nenhum lead entrou no funil nesse período.</p>
      )}
    </div>
  );
}
