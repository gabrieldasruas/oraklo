"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Clock3, KanbanSquare, List, Mail, MousePointerClick, Phone, Search, Send, Trash2 } from "lucide-react";
import { faixaScore } from "@/lib/score";
import { STATUSES, useLeads, type Status } from "@/lib/leads";
import PageHeader from "@/components/app/PageHeader";
import LeadForm from "@/components/app/LeadForm";
import { Aura, Glass, Micro, Pill, WireArt } from "@/components/app/ui";
import CountUp from "@/components/motion/CountUp";
import { useReunioes } from "@/lib/meetings";
import Pipeline, { COR_ETAPA } from "@/components/crm/Pipeline";
import Calendario from "@/components/crm/Calendario";
import ReuniaoModal, { type AberturaReuniao } from "@/components/crm/ReuniaoModal";
import LeadDrawer from "@/components/crm/LeadDrawer";
import CampanhaModal from "@/components/crm/CampanhaModal";
import WhatsappModal from "@/components/crm/WhatsappModal";

type Aba = "pipeline" | "calendario" | "lista";
const ABAS: { v: Aba; t: string; d: string; icon: typeof List }[] = [
  { v: "pipeline", t: "Pipeline", d: "Arraste os leads entre as etapas", icon: KanbanSquare },
  { v: "calendario", t: "Calendário", d: "Reuniões por dia, semana e mês", icon: CalendarDays },
  { v: "lista", t: "Lista", d: "Tabela completa com filtros", icon: List },
];

const statusDot: Record<string, string> = {
  Novo: "bg-night/30",
  "Em sequência": "bg-info-500",
  Respondeu: "bg-warn-400",
  "Reunião marcada": "bg-neon ring-1 ring-night",
  "Sem interesse": "bg-danger-400",
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
  const [zapLead, setZapLead] = useState<string | null>(null);
  const aberto = leads.find((l) => l.id === abertoId) ?? null;
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [filtroEtapa, setFiltroEtapa] = useState<Status | null>(null);
  const [filtroFaixa, setFiltroFaixa] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("pipeline");
  const { reunioes, erro: erroReunioes, agendar, alterar, cancelar } = useReunioes();
  const [abertura, setAbertura] = useState<AberturaReuniao | null>(null);
  const proximasReunioes = reunioes.filter((r) => new Date(r.end) >= new Date()).length;
  const comEmail = useMemo(() => leads.filter((l) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email.trim())), [leads]);
  const prontos = useMemo(() => comEmail.filter((l) => l.status === "Novo"), [comEmail]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter(
      (l) =>
        (!filtroEtapa || l.status === filtroEtapa) &&
        (!filtroFaixa || faixaScore(l.score).rotulo === filtroFaixa) &&
        (!q || [l.name, l.role, l.company, l.place, l.email].some((v) => v.toLowerCase().includes(q))),
    );
  }, [leads, query, filtroEtapa, filtroFaixa]);

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

  function onDelete(id: string, name: string) {
    if (window.confirm(`Excluir o lead "${name}"?`)) removeLead(id);
  }

  return (
    <>
      <PageHeader
        index="02"
        title="Leads"
        description="Seu CRM: leads no pipeline, reuniões no calendário e tudo salvo no workspace da equipe — sem planilha."
        action={<Pill onClick={() => setFormOpen(true)}>Novo lead</Pill>}
      />

      <div className="space-y-4">
        {(error || erroReunioes) && (
          <p role="alert" className="rounded-2xl bg-danger-100 px-5 py-3 text-sm text-danger-900">
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

        {/* destaque: disparo de e-mails */}
        <section
          aria-label="Disparar e-mails"
          className="relative overflow-hidden rounded-[28px] bg-night p-6 text-white shadow-[0_30px_60px_-30px_color-mix(in_srgb,var(--color-night)_80%,transparent)] md:p-7"
        >
          <span aria-hidden className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-neon) 70%, transparent), transparent 70%)" }} />
          <span aria-hidden className="pointer-events-none absolute -bottom-28 right-10 size-72 rounded-full opacity-25 blur-3xl" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-neon) 80%, transparent), transparent 70%)" }} />
          <WireArt kind="waves" className="pointer-events-none absolute -right-10 top-0 h-full w-1/2 text-neon opacity-10" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-neon text-night shadow-[0_0_40px_-6px_color-mix(in_srgb,var(--color-neon)_90%,transparent)]">
                <Send size={24} aria-hidden />
              </span>
              <div className="min-w-0">
                <Micro className="!text-neon !opacity-90">Novo · E-mail com follow-up</Micro>
                <h2 className="mt-1 whitespace-nowrap text-3xl font-light leading-tight tracking-[-0.04em] md:text-4xl">Disparar e-mails</h2>
                <p className="mt-1 max-w-xl text-sm text-white/60">
                  Uma mensagem personalizada para cada lead, com o seu portfólio. Quem não responder recebe o follow-up sozinho.
                </p>
              </div>
            </div>

            <ul className="relative grid grid-cols-3 gap-2 text-center lg:w-[340px]">
              {[
                { icon: Mail, v: comEmail.length, t: "com e-mail" },
                { icon: MousePointerClick, v: prontos.length, t: "prontos (Novo)" },
                { icon: Clock3, v: "auto", t: "follow-up" },
              ].map(({ icon: Icon, v, t }) => (
                <li key={t} className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3">
                  <Icon size={14} aria-hidden className="mx-auto text-neon" />
                  <p className="mt-1.5 text-2xl font-light leading-none tracking-[-0.04em] tabular-nums">{loaded ? v : "–"}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-white/45">{t}</p>
                </li>
              ))}
            </ul>

            <div className="relative flex flex-col gap-2 sm:flex-row lg:flex-col">
              <button
                type="button"
                onClick={() => setCampanha(prontos.map((l) => l.id))}
                className="group flex min-h-14 cursor-pointer items-center justify-center gap-3 rounded-full bg-neon pl-7 pr-3 text-base font-medium text-night shadow-[0_18px_40px_-14px_color-mix(in_srgb,var(--color-neon)_90%,transparent)] transition-transform hover:-translate-y-0.5"
              >
                Disparar agora
                <span className="flex size-9 items-center justify-center rounded-full bg-night text-neon transition-transform group-hover:translate-x-0.5">
                  <ArrowRight size={16} aria-hidden />
                </span>
              </button>
              <button type="button" onClick={() => setCampanha([])} className="min-h-10 cursor-pointer rounded-full border border-white/15 px-5 text-xs text-white/70 hover:bg-white/10 hover:text-white">
                Escolher os leads
              </button>
            </div>
          </div>
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
                    ? "border-night bg-night text-white shadow-[0_24px_50px_-24px_color-mix(in_srgb,var(--color-night)_70%,transparent)]"
                    : "border-white/80 bg-white/70 hover:-translate-y-0.5 hover:border-night/20 hover:bg-white"
                }`}
              >
                {/* brilho neon na aba ativa */}
                {on && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-60 blur-2xl"
                    style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-neon) 55%, transparent), transparent 70%)" }}
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
            onWhatsapp={(l) => setZapLead(l.id)}
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
        {/* resumo leve: clique numa etapa ou faixa de score para filtrar a tabela */}
        <Glass className="grid gap-5 p-5 md:grid-cols-[1.4fr_1fr]">
          <div>
            <Micro>Por etapa</Micro>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-night/5">
              {STATUSES.map((st) => {
                const n = leads.filter((l) => l.status === st).length;
                return n ? <span key={st} title={`${st}: ${n}`} style={{ width: `${(n / Math.max(1, leads.length)) * 100}%`, background: COR_ETAPA[st] }} /> : null;
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STATUSES.map((st) => {
                const n = leads.filter((l) => l.status === st).length;
                const on = filtroEtapa === st;
                return (
                  <button key={st} type="button" onClick={() => setFiltroEtapa(on ? null : st)} aria-pressed={on} className={`flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[11px] ${on ? "border-night bg-night text-white" : "border-night/10 bg-white/70 hover:bg-white"}`}>
                    <span className="size-2 rounded-full" style={{ background: COR_ETAPA[st] }} />
                    {st} <span className="font-mono opacity-60">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Micro>Por score</Micro>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[90, 60, 10].map((v) => {
                const f = faixaScore(v);
                const n = leads.filter((l) => faixaScore(l.score).rotulo === f.rotulo).length;
                const on = filtroFaixa === f.rotulo;
                return (
                  <button key={f.rotulo} type="button" onClick={() => setFiltroFaixa(on ? null : f.rotulo)} aria-pressed={on} className={`cursor-pointer rounded-2xl border p-3 text-left transition-colors ${on ? "border-night bg-night text-white" : "border-white/80 bg-white/60 hover:bg-white"}`}>
                    <span className="inline-block rounded-full px-2 py-0.5 font-mono text-[10px] text-night" style={{ background: f.cor }}>{f.rotulo}</span>
                    <span className="mt-2 block text-2xl font-light tracking-[-0.04em] tabular-nums">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Glass>

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
                    className={`scroll-mt-28 transition-colors duration-700 hover:bg-white/60`}
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
                        <span className="relative h-px w-16 bg-night/15">
                          <span className="absolute inset-y-0 left-0 h-[3px] -translate-y-px bg-night" style={{ width: `${l.score}%` }} />
                        </span>
                        <span className="whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[10px] font-medium text-night" style={{ background: faixaScore(l.score).cor }}>
                          {l.score} · {faixaScore(l.score).rotulo}
                        </span>
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
          onWhatsapp={(l) => setZapLead(l.id)}
        />
      )}
      {zapLead && leads.find((l) => l.id === zapLead) && (
        <WhatsappModal lead={leads.find((l) => l.id === zapLead)!} onFechar={() => setZapLead(null)} onMoveu={(id) => marcarEmSequencia([id])} />
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
