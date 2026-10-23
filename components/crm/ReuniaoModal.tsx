"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserRound, X } from "lucide-react";
import type { Lead } from "@/lib/lead-types";
import { CATEGORIAS, type CategoriaId, type Reuniao, type ReuniaoInput } from "@/lib/meeting-types";
import { iniciais } from "@/lib/crm";
import { deInputs, paraInputData, paraInputHora } from "./datas";

export type AberturaReuniao = { leadId?: string; inicio?: Date; reuniao?: Reuniao };

const DURACOES = [
  { min: 30, t: "30 min" },
  { min: 60, t: "1 h" },
  { min: 90, t: "1h30" },
];

/** Formulário para agendar (ou editar) uma reunião com um lead. */
export default function ReuniaoModal({
  abertura,
  leads,
  onFechar,
  onSalvar,
  onAlterar,
}: {
  abertura: AberturaReuniao;
  leads: Lead[];
  onFechar: () => void;
  onSalvar: (input: ReuniaoInput) => Promise<unknown>;
  onAlterar: (r: Reuniao, campos: Partial<Pick<Reuniao, "title" | "start" | "end" | "category" | "notes">>) => Promise<unknown>;
}) {
  const edicao = abertura.reuniao;
  const inicioPadrao = useMemo(() => {
    if (edicao) return new Date(edicao.start);
    if (abertura.inicio) return abertura.inicio;
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  }, [abertura, edicao]);
  const fimPadrao = edicao ? new Date(edicao.end) : new Date(inicioPadrao.getTime() + 60 * 60_000);

  const [leadId, setLeadId] = useState(edicao?.leadId ?? abertura.leadId ?? "");
  const [busca, setBusca] = useState("");
  const [titulo, setTitulo] = useState(edicao?.title ?? "");
  const [data, setData] = useState(paraInputData(inicioPadrao));
  const [horaIni, setHoraIni] = useState(paraInputHora(inicioPadrao));
  const [horaFim, setHoraFim] = useState(paraInputHora(fimPadrao));
  const [cat, setCat] = useState<CategoriaId>(edicao?.category ?? "reuniao");
  const [notas, setNotas] = useState(edicao?.notes ?? "");
  const [marcarLead, setMarcarLead] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const lead = leads.find((l) => l.id === leadId);
  const opcoes = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (q ? leads.filter((l) => `${l.name} ${l.company}`.toLowerCase().includes(q)) : leads).slice(0, 8);
  }, [busca, leads]);

  // título sugerido a partir do lead
  useEffect(() => {
    if (!edicao && lead && !titulo) setTitulo(`Reunião com ${lead.company}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId]);

  // fecha com Esc
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onFechar]);

  function duracao(min: number) {
    const ini = deInputs(data, horaIni);
    setHoraFim(paraInputHora(new Date(ini.getTime() + min * 60_000)));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const ini = deInputs(data, horaIni);
    const fim = deInputs(data, horaFim);
    if (!leadId) return setErro("Escolha o lead da reunião.");
    if (fim <= ini) return setErro("O horário de fim precisa ser depois do início.");
    setErro(null);
    setSalvando(true);
    if (edicao) await onAlterar(edicao, { title: titulo, start: ini.toISOString(), end: fim.toISOString(), category: cat, notes: notas });
    else await onSalvar({ leadId, title: titulo, start: ini.toISOString(), end: fim.toISOString(), category: cat, notes: notas, marcarLead });
    setSalvando(false);
    onFechar();
  }

  const campo = "mt-1.5 min-h-11 w-full rounded-2xl border border-night/10 bg-white px-4 text-sm focus:border-night focus:outline-none";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-night/40 p-3 backdrop-blur-sm sm:items-center" onClick={onFechar}>
      <form
        role="dialog"
        aria-label={edicao ? "Editar reunião" : "Nova reunião"}
        onSubmit={salvar}
        onClick={(e) => e.stopPropagation()}
        className="previa-in max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] bg-papel-frio p-6 font-display text-night shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">{edicao ? "Editar reunião" : "Agendar reunião"}</p>
            <h2 className="mt-1 text-2xl font-medium tracking-[-0.04em]">{titulo || "Nova reunião"}</h2>
          </div>
          <button type="button" aria-label="Fechar" onClick={onFechar} className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-night/10">
            <X size={16} />
          </button>
        </div>

        {/* lead */}
        <div className="mt-5">
          <p className="text-sm font-medium">Com quem</p>
          {lead ? (
            <div className="mt-1.5 flex items-center gap-3 rounded-2xl bg-white p-3">
              <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-night font-mono text-xs text-neon">
                {iniciais(lead.name)}
                <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-neon text-night ring-2 ring-white">
                  <UserRound size={9} aria-hidden />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{lead.name}</span>
                <span className="block truncate text-xs opacity-60">
                  {lead.role ? `${lead.role} · ` : ""}
                  {lead.company}
                </span>
              </span>
              {!edicao && (
                <button type="button" onClick={() => setLeadId("")} className="cursor-pointer text-xs underline underline-offset-4">
                  Trocar
                </button>
              )}
            </div>
          ) : (
            <div className="mt-1.5 rounded-2xl bg-white p-2">
              <label className="relative block">
                <span className="sr-only">Buscar lead</span>
                <Search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar lead por nome ou empresa" className="min-h-10 w-full rounded-xl pl-9 pr-3 text-sm focus:outline-none" />
              </label>
              <ul className="mt-1 max-h-48 overflow-y-auto">
                {opcoes.map((l) => (
                  <li key={l.id}>
                    <button type="button" onClick={() => setLeadId(l.id)} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-night/5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-night font-mono text-[10px] text-neon">{iniciais(l.name)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{l.name}</span>
                        <span className="block truncate text-[11px] opacity-50">{l.company}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {!opcoes.length && <li className="px-2 py-2 text-xs opacity-60">{leads.length ? "Nenhum lead encontrado." : "Cadastre um lead primeiro."}</li>}
              </ul>
            </div>
          )}
        </div>

        <label className="mt-4 block text-sm font-medium">
          Título
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} placeholder="Ex.: Apresentação da proposta" className={campo} />
        </label>

        <div className="mt-4 grid grid-cols-[1.4fr_1fr_1fr] gap-2">
          <label className="block text-sm font-medium">
            Data
            <input type="date" required value={data} onChange={(e) => setData(e.target.value)} className={campo} />
          </label>
          <label className="block text-sm font-medium">
            Início
            <input type="time" required value={horaIni} onChange={(e) => setHoraIni(e.target.value)} className={campo} />
          </label>
          <label className="block text-sm font-medium">
            Fim
            <input type="time" required value={horaFim} onChange={(e) => setHoraFim(e.target.value)} className={campo} />
          </label>
        </div>
        <div className="mt-2 flex gap-2">
          {DURACOES.map((d) => (
            <button key={d.min} type="button" onClick={() => duracao(d.min)} className="cursor-pointer rounded-full border border-night/15 bg-white px-3 py-1 text-xs hover:bg-night hover:text-white">
              {d.t}
            </button>
          ))}
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium">Categoria</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {CATEGORIAS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={cat === c.id}
                onClick={() => setCat(c.id)}
                className="min-h-9 cursor-pointer rounded-full border-2 px-4 text-xs font-medium transition-transform hover:-translate-y-0.5"
                style={{ background: c.cor, color: c.texto, borderColor: cat === c.id ? c.texto : "transparent" }}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="mt-4 block text-sm font-medium">
          Anotações
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={1000} rows={3} placeholder="Pauta, link da chamada, endereço…" className={`${campo} py-3`} />
        </label>

        {!edicao && (
          <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" checked={marcarLead} onChange={(e) => setMarcarLead(e.target.checked)} className="size-4 accent-night" />
            Mover o lead para <b className="font-medium">Reunião marcada</b> no pipeline
          </label>
        )}

        {erro && (
          <p role="alert" className="mt-3 rounded-2xl bg-danger-100 px-4 py-2.5 text-sm text-danger-900">
            {erro}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onFechar} className="min-h-12 cursor-pointer rounded-full px-5 text-sm hover:bg-night/5">
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="min-h-12 cursor-pointer rounded-full bg-night px-6 text-sm font-medium text-white hover:bg-neon hover:text-night disabled:opacity-60">
            {salvando ? "Salvando…" : edicao ? "Salvar alterações" : "Agendar reunião"}
          </button>
        </div>
      </form>
    </div>
  );
}
