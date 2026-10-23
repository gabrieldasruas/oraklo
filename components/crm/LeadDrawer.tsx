"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  Check,
  CircleCheck,
  ExternalLink,
  Loader2,
  Mail,
  MessageSquareReply,
  NotebookPen,
  Phone,
  Plus,
  Search,
  Sparkles,
  UserRoundSearch,
  X,
} from "lucide-react";
import { LinkedinIcon, WhatsappIcon } from "@/components/brand/Icons";
import { STATUSES, type Lead, type Status } from "@/lib/lead-types";
import { descreverEvento, haQuanto, montarTarefas, type EventoLead } from "@/lib/lead-events";
import { iniciais, linkedinPessoas, nomeParaBusca } from "@/lib/crm";
import { faixaScore } from "@/lib/score";
import { adicionarNota, concluirTarefa, criarTarefa, historicoDoLead } from "@/app/(app)/leads/atividade";
import { marcarResposta } from "@/app/(app)/leads/emails";
import { atualizarLead } from "@/app/(app)/leads/actions";
import { buscarDecisores, dominioDoLead, hunterConfigurado, usarContato, type Pessoa } from "@/app/(app)/leads/enriquecer";
import { COR_ETAPA } from "./Pipeline";
import { enviarLeadsRd } from "@/app/(app)/configuracoes/rd";

type Aba = "atividade" | "tarefas" | "contato";

const TOM: Record<string, string> = {
  neutro: "bg-night/25",
  neon: "bg-neon ring-1 ring-night",
  sol: "bg-warn-400",
  rosa: "bg-danger-400",
  ceu: "bg-info-400",
};

const celular = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length === 11 && d[2] === "9" ? d : null;
};
const hoje = () => new Date().toISOString().slice(0, 10);

/** Painel lateral do lead: histórico, notas, tarefas, dados de contato e decisores. */
export default function LeadDrawer({
  lead,
  onFechar,
  onAtualizado,
  onStatus,
  onAgendar,
  onEmail,
  onWhatsapp,
}: {
  lead: Lead;
  onFechar: () => void;
  onAtualizado: (lead: Lead) => void;
  onStatus: (id: string, status: Status) => void;
  onAgendar: (lead: Lead) => void;
  onEmail: (lead: Lead) => void;
  onWhatsapp: (lead: Lead) => void;
}) {
  const [aba, setAba] = useState<Aba>("atividade");
  const [eventos, setEventos] = useState<EventoLead[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(() => {
    historicoDoLead(lead.id)
      .then(setEventos)
      .catch(() => {
        setErro("Não foi possível carregar o histórico.");
        setEventos((v) => v ?? []);
      });
  }, [lead.id]);

  useEffect(() => {
    setEventos(null);
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onFechar]);

  const tarefas = useMemo(() => montarTarefas(eventos ?? []), [eventos]);
  const abertas = tarefas.filter((t) => !t.feita).length;
  const zap = celular(lead.phone);
  const faixa = faixaScore(lead.score);
  const ultimoEmail = eventos?.find((e) => e.type === "email_sent");
  const abriu = eventos?.some((e) => e.type === "email_opened");
  const respondeu = eventos?.some((e) => e.type === "email_replied");

  async function respondeuAgora() {
    try {
      await marcarResposta(lead.id);
      onAtualizado({ ...lead, status: "Respondeu" });
      recarregar();
    } catch {
      setErro("Não foi possível marcar a resposta.");
    }
  }

  return (
    <>
      <div aria-hidden className="fixed inset-0 z-50 bg-night/30 backdrop-blur-[2px]" onClick={onFechar} />
      <aside
        role="dialog"
        aria-label={`Lead ${lead.name}`}
        className="drawer-in fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col overflow-hidden bg-papel shadow-[0_0_80px_-20px_color-mix(in_srgb,var(--color-black)_60%,transparent)]"
      >
        {/* cabeçalho */}
        <header className="relative overflow-hidden bg-night p-6 text-white">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-neon) 60%, transparent), transparent 70%)" }} />
          <div className="relative flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-neon font-mono text-base text-night">{iniciais(lead.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-2xl font-light leading-tight tracking-[-0.03em]">{lead.name}</p>
              <p className="truncate text-sm text-white/60">
                {lead.role ? `${lead.role} · ` : ""}
                {lead.company}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="relative inline-flex items-center">
                  <span className="sr-only">Etapa</span>
                  <span aria-hidden className="pointer-events-none absolute left-3 size-2 rounded-full" style={{ background: COR_ETAPA[lead.status] }} />
                  <select
                    value={lead.status}
                    onChange={(e) => {
                      onStatus(lead.id, e.target.value as Status);
                      setTimeout(recarregar, 600);
                    }}
                    className="min-h-8 cursor-pointer appearance-none rounded-full border border-white/20 bg-white/10 py-1 pl-7 pr-4 text-xs text-white hover:bg-white/20 [&>option]:text-night"
                  >
                    {STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <span className="tema-original rounded-full px-2.5 py-1 font-mono text-[10px] font-medium text-night" style={{ background: faixa.cor }}>
                  Score {lead.score} · {faixa.rotulo}
                </span>
                {abriu && !respondeu && <span className="rounded-full border border-neon/50 px-2.5 py-1 font-mono text-[10px] text-neon">abriu o e-mail</span>}
              </div>
            </div>
            <button type="button" aria-label="Fechar" onClick={onFechar} className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <X size={16} />
            </button>
          </div>

          {/* ações rápidas */}
          <div className="relative mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => onEmail(lead)} disabled={!lead.email} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full bg-neon px-4 text-xs font-medium text-night disabled:cursor-not-allowed disabled:opacity-40" title={lead.email ? "Enviar e-mail com follow-up" : "Lead sem e-mail — veja a aba Contato"}>
              <Mail size={13} aria-hidden /> E-mail
            </button>
            <button type="button" onClick={() => onAgendar(lead)} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-medium hover:bg-white/20">
              <CalendarPlus size={13} aria-hidden /> Agendar
            </button>
            {ultimoEmail && !respondeu && (
              <button type="button" onClick={() => void respondeuAgora()} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full bg-white/10 px-4 text-xs font-medium hover:bg-white/20" title="Para os follow-ups e move para Respondeu">
                <MessageSquareReply size={13} aria-hidden /> Respondeu
              </button>
            )}
            {zap && (
              <button type="button" onClick={() => onWhatsapp(lead)} title="WhatsApp com modelo ou IA" className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-whatsapp text-white">
                <WhatsappIcon size={15} />
              </button>
            )}
            {lead.phone && !zap && (
              <a href={`tel:+55${lead.phone.replace(/\D/g, "")}`} title="Ligar" className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
                <Phone size={14} aria-hidden />
              </a>
            )}
            <a href={linkedinPessoas(`${nomeParaBusca(lead.name)} ${lead.company}`)} target="_blank" rel="noopener noreferrer" title="Procurar no LinkedIn" className="flex size-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
              <LinkedinIcon size={14} />
            </a>
          </div>
        </header>

        {/* abas */}
        <div role="tablist" className="grid grid-cols-3 gap-1 border-b border-night/10 bg-white/60 p-1.5">
          {(
            [
              { v: "atividade", t: "Atividade", n: eventos?.length },
              { v: "tarefas", t: "Tarefas", n: abertas || undefined },
              { v: "contato", t: "Contato", n: undefined },
            ] as const
          ).map((a) => (
            <button
              key={a.v}
              type="button"
              role="tab"
              aria-selected={aba === a.v}
              onClick={() => setAba(a.v)}
              className={`flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl text-sm transition-colors ${aba === a.v ? "bg-night text-white" : "hover:bg-white"}`}
            >
              {a.t}
              {a.n ? <span className={`rounded-full px-1.5 font-mono text-[10px] ${aba === a.v ? "bg-neon text-night" : "bg-night/10"}`}>{a.n}</span> : null}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 [scrollbar-width:thin]">
          {erro && (
            <p role="alert" className="mb-4 rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-900">
              {erro}
            </p>
          )}
          {aba === "atividade" && <Atividade leadId={lead.id} eventos={eventos} onNovo={(e) => setEventos((v) => [e, ...(v ?? [])])} />}
          {aba === "tarefas" && <Tarefas leadId={lead.id} tarefas={tarefas} onNovo={(e) => setEventos((v) => [e, ...(v ?? [])])} />}
          {aba === "contato" && (
            <Contato
              lead={lead}
              onAtualizado={(l) => {
                onAtualizado(l);
                recarregar();
              }}
            />
          )}
        </div>
      </aside>
    </>
  );
}

// ---------- Atividade ----------

function Atividade({ leadId, eventos, onNovo }: { leadId: string; eventos: EventoLead[] | null; onNovo: (e: EventoLead) => void }) {
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nota.trim()) return;
    setSalvando(true);
    try {
      onNovo(await adicionarNota(leadId, nota));
      setNota("");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={salvar} className="rounded-[20px] border border-white bg-white p-3 shadow-[0_10px_30px_-24px_color-mix(in_srgb,var(--color-black)_50%,transparent)]">
        <label className="flex items-start gap-2">
          <NotebookPen size={15} aria-hidden className="mt-2.5 shrink-0 opacity-40" />
          <span className="sr-only">Nova nota</span>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void salvar(e);
            }}
            rows={2}
            placeholder="Anote algo sobre esse lead (ligação, objeção, próximo passo)…"
            className="min-h-16 w-full resize-y bg-transparent p-2 text-sm outline-none"
          />
        </label>
        <div className="flex items-center justify-between">
          <span className="pl-2 font-mono text-[10px] opacity-40">Ctrl + Enter</span>
          <button type="submit" disabled={salvando || !nota.trim()} className="flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full bg-night px-4 text-xs font-medium text-white disabled:opacity-40">
            {salvando ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} aria-hidden />} Salvar nota
          </button>
        </div>
      </form>

      {!eventos ? (
        <p className="flex items-center gap-2 text-sm opacity-60">
          <Loader2 size={14} className="animate-spin" /> Carregando histórico…
        </p>
      ) : !eventos.length ? (
        <p className="text-sm opacity-60">Nada por aqui ainda.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-night/15 pl-6">
          {eventos.map((e) => {
            const d = descreverEvento(e);
            const nota = e.type === "note";
            return (
              <li key={e.id} className="relative">
                <span className={`absolute -left-[29px] top-1.5 size-2.5 rounded-full ${TOM[d.tom]}`} />
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium leading-snug">{d.titulo}</p>
                  <time dateTime={e.createdAt} title={new Date(e.createdAt).toLocaleString("pt-BR")} className="shrink-0 font-mono text-[10px] uppercase tracking-wider opacity-45">
                    {haQuanto(e.createdAt)}
                  </time>
                </div>
                {d.detalhe && <p className={`mt-1 whitespace-pre-line text-xs leading-relaxed ${nota ? "rounded-xl bg-white p-3 text-[13px] opacity-90" : "opacity-60"}`}>{d.detalhe}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ---------- Tarefas ----------

function Tarefas({ leadId, tarefas, onNovo }: { leadId: string; tarefas: ReturnType<typeof montarTarefas>; onNovo: (e: EventoLead) => void }) {
  const [titulo, setTitulo] = useState("");
  const [vence, setVence] = useState(hoje());
  const [salvando, setSalvando] = useState(false);
  const ordenadas = [...tarefas].sort((a, b) => Number(a.feita) - Number(b.feita) || (a.vence ?? "9").localeCompare(b.vence ?? "9"));

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo.trim()) return;
    setSalvando(true);
    try {
      onNovo(await criarTarefa(leadId, titulo, vence ? `${vence}T12:00:00` : null));
      setTitulo("");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={criar} className="flex flex-wrap gap-2 rounded-[20px] border border-white bg-white p-3">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Nova tarefa</span>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Ligar para confirmar proposta" className="min-h-10 w-full rounded-full bg-night/5 px-4 text-sm outline-none focus:bg-night/10" />
        </label>
        <label>
          <span className="sr-only">Para quando</span>
          <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className="min-h-10 rounded-full bg-night/5 px-3 text-xs" />
        </label>
        <button type="submit" disabled={salvando || !titulo.trim()} className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-night px-4 text-xs font-medium text-white disabled:opacity-40">
          {salvando ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} aria-hidden />} Criar
        </button>
      </form>

      {!ordenadas.length && <p className="px-1 text-sm opacity-60">Sem tarefas. Crie lembretes de follow-up para não perder o timing.</p>}
      <ul className="space-y-2">
        {ordenadas.map((t) => {
          const atrasada = !t.feita && t.vence && t.vence.slice(0, 10) < hoje();
          return (
            <li key={t.id} className={`flex items-center gap-3 rounded-[18px] border bg-white p-3 ${t.feita ? "border-transparent opacity-50" : atrasada ? "border-danger-300" : "border-white"}`}>
              <button
                type="button"
                aria-label={t.feita ? "Reabrir tarefa" : "Concluir tarefa"}
                onClick={async () => onNovo(await concluirTarefa(leadId, t.id, t.titulo, !t.feita))}
                className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors ${t.feita ? "border-night bg-night text-neon" : "border-night/25 hover:border-night hover:bg-neon"}`}
              >
                {t.feita && <Check size={14} />}
              </button>
              <span className={`min-w-0 flex-1 text-sm ${t.feita ? "line-through" : ""}`}>{t.titulo}</span>
              {t.vence && (
                <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] ${atrasada ? "bg-danger-100 text-danger-800" : "bg-night/5"}`}>
                  {new Date(t.vence).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Contato + decisores ----------

function Contato({ lead, onAtualizado }: { lead: Lead; onAtualizado: (l: Lead) => void }) {
  const [form, setForm] = useState({ name: lead.name, role: lead.role, email: lead.email, phone: lead.phone, place: lead.place });
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk] = useState(false);
  const mudou = (Object.keys(form) as (keyof typeof form)[]).some((k) => form[k] !== lead[k]);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      onAtualizado(await atualizarLead(lead.id, form));
      setOk(true);
      setTimeout(() => setOk(false), 1800);
    } finally {
      setSalvando(false);
    }
  }

  const campos: { k: keyof typeof form; t: string; tipo?: string }[] = [
    { k: "name", t: "Nome" },
    { k: "role", t: "Cargo" },
    { k: "email", t: "E-mail", tipo: "email" },
    { k: "phone", t: "Telefone" },
    { k: "place", t: "Cidade" },
  ];

  return (
    <div className="space-y-5">
      <form onSubmit={salvar} className="rounded-[20px] border border-white bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {campos.map((c) => (
            <label key={c.k} className={c.k === "email" ? "sm:col-span-2" : ""}>
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest opacity-50">{c.t}</span>
              <input type={c.tipo ?? "text"} value={form[c.k]} onChange={(e) => setForm({ ...form, [c.k]: e.target.value })} className="min-h-10 w-full rounded-xl bg-night/5 px-3 text-sm outline-none focus:bg-night/10" />
            </label>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <button type="submit" disabled={!mudou || salvando} className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-night px-4 text-xs font-medium text-white disabled:opacity-40">
            {salvando ? <Loader2 size={12} className="animate-spin" /> : ok ? <CircleCheck size={12} /> : null} {ok ? "Salvo" : "Salvar contato"}
          </button>
        </div>
      </form>

      <Decisores lead={lead} onAtualizado={onAtualizado} />
      <EnviarRd leadId={lead.id} />
    </div>
  );
}

function Decisores({ lead, onAtualizado }: { lead: Lead; onAtualizado: (l: Lead) => void }) {
  const [configurado, setConfigurado] = useState<boolean | null>(null);
  const [liberado, setLiberado] = useState(true);
  const [dominio, setDominio] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [res, setRes] = useState<{ pessoas: Pessoa[]; organizacao: string | null } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [usando, setUsando] = useState<string | null>(null);

  useEffect(() => {
    hunterConfigurado()
      .then((r) => {
        setConfigurado(r.configurado);
        setLiberado(r.liberado);
      })
      .catch(() => setConfigurado(false));
    dominioDoLead(lead.id).then((d) => d && setDominio(d)).catch(() => {});
  }, [lead.id]);

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setBuscando(true);
    setErro(null);
    try {
      setRes(await buscarDecisores(dominio));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha na busca");
    } finally {
      setBuscando(false);
    }
  }

  async function usar(p: Pessoa) {
    setUsando(p.email);
    try {
      await usarContato(lead.id, p);
      onAtualizado({ ...lead, name: p.nome, role: p.cargo, email: p.email });
    } finally {
      setUsando(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-[20px] bg-night text-white">
      <div className="flex items-center gap-3 p-4">
        <span className="flex size-9 items-center justify-center rounded-xl bg-neon text-night">
          <UserRoundSearch size={17} aria-hidden />
        </span>
        <div>
          <p className="font-medium leading-tight">Encontrar decisores</p>
          <p className="text-xs text-white/55">Nomes, cargos e e-mails corporativos pelo domínio da empresa</p>
        </div>
      </div>

      {!liberado ? (
        <div className="border-t border-white/10 p-4 text-sm text-white/70">
          <p className="flex items-start gap-2">
            <Sparkles size={14} aria-hidden className="mt-0.5 shrink-0 text-neon" />
            <span>Encontrar decisores faz parte do pacote Premium.</span>
          </p>
          <a href="/pacotes" className="mt-3 inline-flex items-center gap-1.5 text-xs text-neon underline-offset-4 hover:underline">
            Ver pacotes
          </a>
        </div>
      ) : configurado === false ? (
        <div className="border-t border-white/10 p-4 text-sm text-white/70">
          <p className="flex items-start gap-2">
            <Sparkles size={14} aria-hidden className="mt-0.5 shrink-0 text-neon" />
            <span>
              Para ativar, crie uma conta no Hunter (tem plano grátis), copie a API key e adicione <code className="rounded bg-white/10 px-1.5 font-mono text-[11px] text-neon">HUNTER_API_KEY</code> nas variáveis da Vercel.
            </span>
          </p>
          <a href="https://hunter.io/api-keys" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs text-neon underline-offset-4 hover:underline">
            Pegar a chave no Hunter <ExternalLink size={11} aria-hidden />
          </a>
        </div>
      ) : (
        <form onSubmit={buscar} className="flex gap-2 border-t border-white/10 p-4">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Domínio da empresa</span>
            <Search size={14} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" />
            <input value={dominio} onChange={(e) => setDominio(e.target.value)} placeholder="empresa.com.br" className="min-h-10 w-full rounded-full bg-white/10 pl-9 pr-3 text-sm outline-none placeholder:text-white/40 focus:bg-white/15" />
          </label>
          <button type="submit" disabled={buscando || !dominio.trim() || configurado === null} className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-neon px-4 text-xs font-medium text-night disabled:opacity-50">
            {buscando ? <Loader2 size={12} className="animate-spin" /> : null} Buscar
          </button>
        </form>
      )}

      {erro && <p className="px-4 pb-4 text-sm text-danger-300">{erro}</p>}
      {res && (
        <ul className="divide-y divide-white/10 border-t border-white/10">
          {!res.pessoas.length && <li className="p-4 text-sm text-white/60">Nenhum contato público encontrado para esse domínio.</li>}
          {res.pessoas.map((p) => (
            <li key={p.email} className="flex items-center gap-3 p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[11px]">{iniciais(p.nome)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{p.nome}</p>
                <p className="truncate text-xs text-white/55">{p.cargo || "Cargo não informado"}</p>
                <p className="truncate font-mono text-[11px] text-neon/80">
                  {p.email} · {p.confianca}%
                </p>
              </div>
              {p.linkedin && (
                <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="flex size-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" title="LinkedIn">
                  <LinkedinIcon size={13} />
                </a>
              )}
              <button type="button" onClick={() => void usar(p)} disabled={!!usando} className="min-h-8 shrink-0 cursor-pointer rounded-full border border-white/20 px-3 text-[11px] hover:bg-neon hover:text-night disabled:opacity-50">
                {usando === p.email ? <Loader2 size={12} className="animate-spin" /> : lead.email === p.email ? "Em uso" : "Usar contato"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EnviarRd({ leadId }: { leadId: string }) {
  const [estado, setEstado] = useState<null | "enviando" | { ok: boolean; texto: string }>(null);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[20px] border border-white bg-white p-4">
      <span className="flex size-9 items-center justify-center rounded-xl bg-rd text-[11px] font-semibold text-white">RD</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">RD Station CRM</p>
        <p className="text-xs opacity-55">Cria empresa, contato e negociação no seu RD.</p>
      </div>
      <button
        type="button"
        disabled={estado === "enviando"}
        onClick={async () => {
          setEstado("enviando");
          const r = await enviarLeadsRd([leadId]).catch(() => ({ ok: false as const, erro: "Não foi possível enviar." }));
          if (!r.ok) return setEstado({ ok: false, texto: r.erro });
          setEstado(r.enviados ? { ok: true, texto: "Enviado ao RD Station" } : r.jaEstavam ? { ok: true, texto: "Já está no RD Station" } : { ok: false, texto: r.aviso ?? "Não foi possível enviar." });
        }}
        className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-night px-4 text-xs font-medium text-white disabled:opacity-50"
      >
        {estado === "enviando" && <Loader2 size={12} className="animate-spin" />} Enviar ao RD
      </button>
      {estado && estado !== "enviando" && <p className={`w-full text-xs ${estado.ok ? "text-good-700" : "text-danger-700"}`}>{estado.texto}</p>}
    </div>
  );
}
