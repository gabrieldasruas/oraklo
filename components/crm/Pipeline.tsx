"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, GripVertical, Mail, Phone, Send, UserRound } from "lucide-react";
import { WhatsappIcon } from "@/components/brand/Icons";
import { STATUSES, type Lead, type Status } from "@/lib/lead-types";
import { categoria, type Reuniao } from "@/lib/meeting-types";
import { iniciais } from "@/lib/crm";
import { faixaScore } from "@/lib/score";

// Cor de cada etapa do funil (as mesmas da constelação de leads).
export const COR_ETAPA: Record<Status, string> = {
  Novo: "#a1a1aa",
  "Em sequência": "#38bdf8",
  Respondeu: "#fbbf24",
  "Reunião marcada": "#b8ff3c",
  "Sem interesse": "#fb7185",
};

const DICA_ETAPA: Record<Status, string> = {
  Novo: "Ainda não abordado",
  "Em sequência": "Recebendo cadência",
  Respondeu: "Responderam",
  "Reunião marcada": "Com reunião agendada",
  "Sem interesse": "Descartados",
};

const quando = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })} · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};
const celular = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length === 11 && d[2] === "9" ? d : null;
};

/** Pipeline kanban: arraste o card para mudar a etapa (salva no banco). */
export default function Pipeline({
  leads,
  reunioes,
  onMover,
  onAgendar,
  onAbrir,
  onEmail,
}: {
  leads: Lead[];
  reunioes: Reuniao[];
  onMover: (id: string, status: Status) => void;
  onAgendar: (lead: Lead) => void;
  onAbrir: (lead: Lead) => void;
  onEmail: (ids: string[]) => void;
}) {
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<Status | null>(null);

  // próxima reunião de cada lead
  const proxima = useMemo(() => {
    const agora = Date.now();
    const m = new Map<string, Reuniao>();
    for (const r of reunioes) {
      if (new Date(r.end).getTime() < agora) continue;
      const atual = m.get(r.leadId);
      if (!atual || r.start < atual.start) m.set(r.leadId, r);
    }
    return m;
  }, [reunioes]);

  const porEtapa = useMemo(() => {
    const g = new Map<Status, Lead[]>(STATUSES.map((s) => [s, []]));
    for (const l of leads) g.get(l.status)?.push(l);
    for (const list of g.values()) list.sort((a, b) => b.score - a.score);
    return g;
  }, [leads]);

  return (
    <div className="grid snap-x auto-cols-[minmax(270px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
      {STATUSES.map((etapa) => {
        const lista = porEtapa.get(etapa) ?? [];
        const ativo = sobre === etapa && arrastando;
        return (
          <section
            key={etapa}
            aria-label={etapa}
            onDragOver={(e) => {
              e.preventDefault();
              setSobre(etapa);
            }}
            onDragLeave={() => setSobre((s) => (s === etapa ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain");
              const lead = leads.find((l) => l.id === id);
              if (lead && lead.status !== etapa) onMover(id, etapa);
              setSobre(null);
              setArrastando(null);
            }}
            className={`flex snap-start flex-col rounded-[24px] border p-2 transition-colors ${
              ativo ? "border-night bg-white/80" : "border-white/70 bg-white/40"
            }`}
          >
            <header className="flex items-center justify-between gap-2 px-2 pb-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="size-2.5 rounded-full ring-1 ring-night/20" style={{ background: COR_ETAPA[etapa] }} />
                <h3 className="text-sm font-medium tracking-[-0.01em]">{etapa}</h3>
                <span className="rounded-full bg-night/8 px-2 py-0.5 font-mono text-[10px] tabular-nums">{lista.length}</span>
              </div>
              <span className="flex items-center gap-1.5">
                <span className="text-[10px] opacity-50">{DICA_ETAPA[etapa]}</span>
                {lista.some((l) => l.email) && (
                  <button
                    type="button"
                    onClick={() => onEmail(lista.filter((l) => l.email).map((l) => l.id))}
                    title={`Enviar e-mail para os leads de "${etapa}"`}
                    className="flex size-6 cursor-pointer items-center justify-center rounded-full opacity-40 hover:bg-night hover:text-neon hover:opacity-100"
                  >
                    <Send size={11} aria-hidden />
                  </button>
                )}
              </span>
            </header>

            <ul className="flex max-h-[620px] min-h-24 flex-col gap-2 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
              {lista.map((l) => {
                const r = proxima.get(l.id);
                const cat = r ? categoria(r.category) : null;
                const zap = celular(l.phone);
                return (
                  <li
                    key={l.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", l.id);
                      e.dataTransfer.effectAllowed = "move";
                      setArrastando(l.id);
                    }}
                    onDragEnd={() => {
                      setArrastando(null);
                      setSobre(null);
                    }}
                    className={`group cursor-grab rounded-[18px] border border-white/80 bg-white p-3 shadow-[0_10px_24px_-18px_rgba(10,10,10,0.5)] transition-[transform,opacity] active:cursor-grabbing ${
                      arrastando === l.id ? "rotate-1 opacity-50" : "hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-night font-mono text-[11px] text-neon">
                        {iniciais(l.name)}
                        <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-neon text-night ring-2 ring-white">
                          <UserRound size={8} aria-hidden />
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => onAbrir(l)} className="block max-w-full cursor-pointer truncate text-left text-sm font-medium leading-tight underline-offset-4 hover:underline">
                          {l.name}
                        </button>
                        <p className="truncate text-[11px] opacity-60">
                          {l.role ? `${l.role} · ` : ""}
                          {l.company}
                        </p>
                      </div>
                      <GripVertical size={14} aria-hidden className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-40" />
                    </div>

                    {/* score */}
                    <div className="mt-3 flex items-center gap-2" title="Score automático: porte, capital social, contatos, matriz e tempo de mercado">
                      <span className="font-mono text-[9px] uppercase tracking-widest opacity-45">Score</span>
                      <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-night/10">
                        <span className="absolute inset-y-0 left-0 rounded-full bg-night" style={{ width: `${l.score}%` }} />
                      </span>
                      <span className="rounded-full px-2 py-0.5 font-mono text-[10px] font-medium tabular-nums text-night" style={{ background: faixaScore(l.score).cor }}>
                        {l.score} · {faixaScore(l.score).rotulo}
                      </span>
                    </div>

                    {/* próxima reunião */}
                    {r && cat && (
                      <p
                        className="mt-2.5 flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-[11px]"
                        style={{ background: cat.cor, color: cat.texto }}
                        title={r.title}
                      >
                        <CalendarPlus size={12} aria-hidden /> {quando(r.start)}
                      </p>
                    )}

                    {/* ações */}
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onAgendar(l)}
                        className="flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full bg-night px-3 text-[11px] font-medium text-white hover:bg-neon hover:text-night"
                      >
                        <CalendarPlus size={12} aria-hidden /> Agendar
                      </button>
                      {zap ? (
                        <a href={`https://wa.me/55${zap}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="flex size-8 items-center justify-center rounded-full bg-[#25d366] text-white">
                          <WhatsappIcon size={14} />
                        </a>
                      ) : (
                        l.phone && (
                          <a href={`tel:+55${l.phone.replace(/\D/g, "")}`} title="Ligar" className="flex size-8 items-center justify-center rounded-full border border-night/15 hover:bg-night hover:text-white">
                            <Phone size={13} aria-hidden />
                          </a>
                        )
                      )}
                      {l.email && (
                        <button type="button" onClick={() => onEmail([l.id])} title={`E-mail para ${l.email}`} className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-night/15 hover:bg-night hover:text-white">
                          <Mail size={13} aria-hidden />
                        </button>
                      )}
                      {/* mover sem arrastar (teclado / celular) */}
                      <label className="ml-auto">
                        <span className="sr-only">Mover {l.name} para</span>
                        <select
                          value={l.status}
                          onChange={(e) => onMover(l.id, e.target.value as Status)}
                          className="max-w-[6.5rem] cursor-pointer truncate rounded-full border border-night/10 bg-white py-1 pl-2 pr-1 text-[10px] opacity-60 hover:opacity-100"
                        >
                          {STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </li>
                );
              })}
              {!lista.length && (
                <li className={`flex min-h-24 items-center justify-center rounded-[18px] border border-dashed text-center text-[11px] ${ativo ? "border-night opacity-80" : "border-night/15 opacity-50"}`}>
                  {ativo ? "Solte aqui" : "Arraste um lead para cá"}
                </li>
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
