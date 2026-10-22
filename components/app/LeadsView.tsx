"use client";

import { useMemo, useState } from "react";
import { CalendarDays, KanbanSquare, List, Mail, Phone, Search, Trash2 } from "lucide-react";
import { STATUSES, useLeads, type Status } from "@/lib/leads";
import PageHeader from "@/components/app/PageHeader";
import LeadForm from "@/components/app/LeadForm";
import { Aura, Glass, Micro, Pill, WireArt } from "@/components/app/ui";
import { LeadsConstellation } from "@/components/three/lazy";
import CountUp from "@/components/motion/CountUp";
import { useReunioes } from "@/lib/meetings";
import Pipeline from "@/components/crm/Pipeline";
import Calendario from "@/components/crm/Calendario";
import ReuniaoModal, { type AberturaReuniao } from "@/components/crm/ReuniaoModal";
import LeadDrawer from "@/components/crm/LeadDrawer";
import CampanhaModal from "@/components/crm/CampanhaModal";

type Aba = "pipeline" | "calendario" | "lista";
const ABAS: { v: Aba; t: string; d: string; icon: typeof List }[] = [
  { v: "pipeline", t: "Pipeline", d: "Arraste os leads entre as etapas", icon: KanbanSquare },
  { v: "calendario", t: "Calendário", d: "Reuniões por dia, semana e mês", icon: CalendarDays },
  { v: "lista", t: "Lista", d: "Tabela completa e constelação 3D", icon: List },
];

const statusDot: Record<string, string> = {
  Novo: "bg-night/30",
  "Em sequência": "bg-sky-500",
  Respondeu: "bg-amber-400",
  "Reunião marcada": "bg-neon ring-1 ring-night",
  "Sem interesse": "bg-rose-400",
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

export default function LeadsView() {
  const { leads, loaded, error, addLead, removeLead, updateStatus, substituir, marcarEmSequencia } = useLeads();
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [campanha, setCampanha] = useState<string[] | null>(null);
  const aberto = leads.find((l) => l.id === abertoId) ?? null;
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("pipeline");
  const { reunioes, erro: erroReunioes, agendar, alterar, cancelar } = useReunioes();
  const [abertura, setAbertura] = useState<AberturaReuniao | null>(null);
  const proximasReunioes = reunioes.filter((r) => new Date(r.end) >= new Date()).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.role, l.company, l.place, l.email].some((v) => v.toLowerCase().includes(q)),
    );
  }, [leads, query]);

  const kpis = [
    { label: "Leads na lista", value: leads.length, tone: "night" as const },
    { label: "Contatados", value: leads.filter((l) => l.status !== "Novo").length, tone: "lime" as const },
    {
      label: "Respostas",
      value: leads.filter((l) => l.status === "Respondeu" || l.status === "Reunião marcada").length,
      tone: "sun" as const,
    },
    { label: "Reuniões agendadas", value: proximasReunioes, tone: "mint" as const },
  ];

  // Vindo da constelação 3D: limpa a busca, rola até o lead e destaca a linha.
  function pick(id: string) {
    setQuery("");
    setPicked(id);
    requestAnimationFrame(() =>
      document.getElementById(`lead-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
    window.setTimeout(() => setPicked((p) => (p === id ? null : p)), 2400);
  }

  function onDelete(id: string, name: string) {
    if (window.confirm(`Excluir o lead "${name}"?`)) removeLead(id);
  }

  return (
    <>
      <PageHeader
        index="02"
        title="Leads"
        description="Seu CRM: leads no pipeline, reuniões no calendário e tudo salvo no workspace da equipe — sem planilha."
        action={
          <div className="flex flex-wrap gap-2">
            <Pill tone="ghost" onClick={() => setCampanha([])}>
              Disparar e-mails
            </Pill>
            <Pill onClick={() => setFormOpen(true)}>Novo lead</Pill>
          </div>
        }
      />

      <div className="space-y-4">
        {(error || erroReunioes) && (
          <p role="alert" className="rounded-2xl bg-rose-100 px-5 py-3 text-sm text-rose-900">
            {error ?? erroReunioes}
          </p>
        )}
        <section aria-label="Resumo" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k, i) => (
            <Aura key={k.label} tone={k.tone} className="relative min-h-[140px] p-5">
              <WireArt
                kind={(["rings", "waves", "fan", "orbit"] as const)[i]}
                className={`absolute -bottom-6 -right-6 size-32 opacity-25 ${k.tone === "night" ? "text-neon" : "text-night"}`}
              />
              <Micro className="relative !opacity-70">{k.label}</Micro>
              <p className="relative mt-5 text-6xl font-light leading-none tracking-[-0.05em] tabular-nums">
                {loaded ? <CountUp value={k.value} /> : "–"}
              </p>
            </Aura>
          ))}
        </section>

        {/* abas do CRM */}
        <div role="tablist" aria-label="Visões do CRM" className="grid gap-3 sm:grid-cols-3">
          {ABAS.map(({ v, t, d, icon: Icon }) => {
            const on = aba === v;
            const numero = v === "pipeline" ? leads.length : v === "calendario" ? proximasReunioes : leads.length;
            const legenda = v === "pipeline" ? "leads no funil" : v === "calendario" ? "reuniões agendadas" : "contatos";
            return (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setAba(v)}
                className={`group relative flex min-h-24 cursor-pointer items-center gap-4 overflow-hidden rounded-[24px] border p-4 text-left transition-all duration-300 md:p-5 ${
                  on
                    ? "border-night bg-night text-white shadow-[0_24px_50px_-24px_rgba(10,10,10,0.7)]"
                    : "border-white/80 bg-white/70 hover:-translate-y-0.5 hover:border-night/20 hover:bg-white"
                }`}
              >
                {/* brilho neon na aba ativa */}
                {on && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-60 blur-2xl"
                    style={{ background: "radial-gradient(circle, rgba(184,255,60,0.55), transparent 70%)" }}
                  />
                )}
                <span
                  className={`relative flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${
                    on ? "bg-neon text-night" : "bg-night/5 text-night group-hover:bg-night group-hover:text-neon"
                  }`}
                >
                  <Icon size={22} aria-hidden />
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className="block text-lg font-medium leading-tight tracking-[-0.02em] md:text-xl">{t}</span>
                  <span className={`block truncate text-xs ${on ? "text-white/60" : "opacity-55"}`}>{d}</span>
                </span>
                <span className="relative shrink-0 text-right">
                  <span className={`block text-3xl font-light leading-none tracking-[-0.05em] tabular-nums ${on ? "text-neon" : ""}`}>
                    {loaded ? numero : "–"}
                  </span>
                  <span className={`block font-mono text-[9px] uppercase tracking-widest ${on ? "text-white/50" : "opacity-45"}`}>{legenda}</span>
                </span>
              </button>
            );
          })}
        </div>

        {aba === "pipeline" && (
          <Pipeline
            leads={leads}
            reunioes={reunioes}
            onMover={updateStatus}
            onAgendar={(l) => setAbertura({ leadId: l.id })}
            onAbrir={(l) => setAbertoId(l.id)}
            onEmail={setCampanha}
          />
        )}

        {aba === "calendario" && (
          <Calendario
            leads={leads}
            reunioes={reunioes}
            onNova={(inicio) => setAbertura({ inicio })}
            onEditar={(r) => setAbertura({ reuniao: r })}
            onCancelar={(r) => {
              if (window.confirm(`Cancelar a reunião "${r.title}"?`)) void cancelar(r);
            }}
          />
        )}

        {aba === "lista" && (
          <>
        {/* constelação 3D dos leads: clicar num ponto leva até a linha da tabela */}
        <LeadsConstellation leads={leads} onPick={pick} />

        <Glass className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-night/10 p-4">
            <label className="relative block w-full sm:max-w-sm">
              <span className="sr-only">Buscar leads</span>
              <Search size={16} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, cargo ou empresa"
                className="min-h-12 w-full rounded-full border border-night/10 bg-white/70 pl-11 pr-4 text-sm"
              />
            </label>
            <Micro>{loaded ? `${filtered.length} de ${leads.length} leads` : "Carregando…"}</Micro>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <caption className="sr-only">Lista de leads</caption>
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
                  <th scope="col" className="px-6 py-4 font-normal">Contato</th>
                  <th scope="col" className="px-4 py-4 font-normal">Empresa</th>
                  <th scope="col" className="px-4 py-4 font-normal">Localização</th>
                  <th scope="col" className="px-4 py-4 font-normal">Status</th>
                  <th scope="col" className="px-4 py-4 font-normal">Score</th>
                  <th scope="col" className="px-4 py-4 font-normal">Cadastro</th>
                  <th scope="col" className="px-4 py-4"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-night/10 border-t border-night/10">
                {filtered.map((l) => (
                  <tr
                    key={l.id}
                    id={`lead-${l.id}`}
                    className={`scroll-mt-28 transition-colors duration-700 hover:bg-white/60 ${picked === l.id ? "bg-neon/40" : ""}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-night font-mono text-xs text-neon">
                          {initials(l.name)}
                        </span>
                        <span className="min-w-0">
                          <button type="button" onClick={() => setAbertoId(l.id)} className="block cursor-pointer text-left font-medium tracking-[-0.01em] underline-offset-4 hover:underline">
                            {l.name}
                          </button>
                          <span className="block text-xs opacity-55">{l.role || "—"}</span>
                          {(l.email || l.phone) && (
                            <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs opacity-55">
                              {l.email && (
                                <span className="flex items-center gap-1">
                                  <Mail size={11} aria-hidden /> {l.email}
                                </span>
                              )}
                              {l.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={11} aria-hidden /> {l.phone}
                                </span>
                              )}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{l.company}</td>
                    <td className="px-4 py-4 opacity-60">{l.place || "—"}</td>
                    <td className="px-4 py-4">
                      <label className="relative inline-flex items-center">
                        <span className="sr-only">Status de {l.name}</span>
                        <span
                          aria-hidden
                          className={`pointer-events-none absolute left-3 size-2 rounded-full ${statusDot[l.status]}`}
                        />
                        <select
                          value={l.status}
                          onChange={(e) => updateStatus(l.id, e.target.value as Status)}
                          className="min-h-9 cursor-pointer appearance-none rounded-full border border-night/10 bg-white/70 py-1.5 pl-7 pr-4 text-xs hover:bg-white"
                        >
                          {STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="relative h-px w-20 bg-night/15">
                          <span className="absolute inset-y-0 left-0 h-[3px] -translate-y-px bg-night" style={{ width: `${l.score}%` }} />
                        </span>
                        <span className="w-7 font-mono text-xs tabular-nums">{l.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs opacity-55">
                      {new Date(l.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDelete(l.id, l.name)}
                        aria-label={`Excluir ${l.name}`}
                        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full opacity-50 hover:bg-night hover:text-white hover:opacity-100"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loaded && filtered.length === 0 && (
            <p className="px-5 py-14 text-center text-sm opacity-60">
              {leads.length === 0
                ? "Nenhum lead cadastrado ainda. Clique em “Novo lead” ou adicione uma empresa a partir da busca."
                : "Nenhum lead encontrado para essa busca."}
            </p>
          )}
        </Glass>
          </>
        )}
      </div>

      {aberto && (
        <LeadDrawer
          lead={aberto}
          onFechar={() => setAbertoId(null)}
          onAtualizado={substituir}
          onStatus={updateStatus}
          onAgendar={(l) => setAbertura({ leadId: l.id })}
          onEmail={(l) => setCampanha([l.id])}
        />
      )}
      {campanha && <CampanhaModal leads={leads} inicial={campanha} onFechar={() => setCampanha(null)} onEnviado={marcarEmSequencia} />}
      <LeadForm open={formOpen} onClose={() => setFormOpen(false)} onSave={addLead} />
      {abertura && (
        <ReuniaoModal
          abertura={abertura}
          leads={leads}
          onFechar={() => setAbertura(null)}
          onSalvar={async (input) => {
            const r = await agendar(input);
            // agendou → o lead vai para "Reunião marcada" no pipeline (se a opção estiver marcada)
            const lead = leads.find((l) => l.id === input.leadId);
            if (r && input.marcarLead !== false && lead && lead.status !== "Reunião marcada") void updateStatus(input.leadId, "Reunião marcada");
          }}
          onAlterar={alterar}
        />
      )}
    </>
  );
}
