import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CircleAlert, Eye, ListTodo, MailOpen, Send } from "lucide-react";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import { Aura, Glass, Micro, WireArt } from "@/components/app/ui";
import Prospecta3D from "@/components/three/Prospecta3DLazy";
import CountUp from "@/components/motion/CountUp";
import { Reveal } from "@/components/motion/Reveal";
import PrimeirosPassos from "@/components/app/PrimeirosPassos";
import RadarCard from "@/components/app/RadarCard";
import { radar } from "@/lib/radar";
import { LIMITES, planoDoWorkspace } from "@/lib/planos";
import { PORTFOLIO_TAG } from "@/lib/portfolio-types";
import { carregarPerfil } from "../segmentacao/perfil";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { descreverEvento, haQuanto, type EventoLead } from "@/lib/lead-events";
import { categoria } from "@/lib/meeting-types";
import { listarReunioes } from "../leads/reunioes";
import { tarefasDoWorkspace } from "../leads/atividade";
import { resumoEmails } from "../leads/emails";
import { estatisticasPortfolio } from "../portfolio/actions";

export const metadata: Metadata = { title: `Visão geral — ${site.name}` };

const DIA = 86_400_000;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const sinal = (n: number) => (n > 0 ? `+${n}` : String(n));
const TOM: Record<string, string> = { neutro: "bg-night/30", neon: "bg-neon ring-1 ring-night", sol: "bg-amber-400", rosa: "bg-rose-400", ceu: "bg-sky-400" };

export default async function PainelPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const agora = Date.now();
  const [{ data: leadsRaw }, { data: eventosRaw }, reunioes, tarefas, emails, portfolio] = await Promise.all([
    supabase.from("leads").select("id, name, company, status, created_at").order("created_at", { ascending: false }).limit(5000),
    supabase
      .from("lead_events")
      .select("id, lead_id, type, payload, created_at")
      .not("type", "in", "(meeting_updated,email_opened)")
      .order("created_at", { ascending: false })
      .limit(12),
    listarReunioes().catch(() => []),
    tarefasDoWorkspace().catch(() => []),
    resumoEmails().catch(() => ({ enviados: 0, abertos: 0, respondidos: 0, followups: 0 })),
    estatisticasPortfolio().catch(() => ({ id: null, total: 0, semana: 0, ultima: null })),
  ]);
  // primeiros passos
  const [perfil, { data: port }, { count: abordagens }, { count: reunioesFeitas }] = await Promise.all([
    carregarPerfil().catch(() => null),
    supabase.from("lists").select("filter").eq("tag", PORTFOLIO_TAG).limit(1).maybeSingle(),
    supabase.from("lead_events").select("id", { count: "exact", head: true }).in("type", ["email_sent", "whatsapp_opened"]),
    supabase.from("lead_events").select("id", { count: "exact", head: true }).eq("type", "meeting_created"),
  ]);
  const [radarRes, plano] = await Promise.all([radar(perfil && perfil.nichos.length ? perfil : null).catch(() => null), planoDoWorkspace(supabase, user.workspaceId)]);
  const passos = [
    { t: "Monte seu cliente ideal", d: "Escolha nichos e porte na Segmentação", href: "/segmentacao#foco", feito: !!perfil && perfil.nichos.length > 0 },
    { t: "Mande empresas ao pipeline", d: "Busque no mapa e selecione as melhores", href: "/busca-avancada", feito: (leadsRaw ?? []).length > 0 },
    { t: "Personalize seu portfólio", d: "Logo, soluções e cases em slides", href: "/portfolio", feito: !!port },
    { t: "Ligue o link público", d: "Saiba quem abriu sua apresentação", href: "/portfolio", feito: !!(port?.filter as { compartilhar?: { ativo?: boolean } } | null)?.compartilhar?.ativo },
    { t: "Faça a primeira abordagem", d: "E-mail com follow-up ou WhatsApp", href: "/leads", feito: (abordagens ?? 0) > 0 },
    { t: "Marque a primeira reunião", d: "Leve para o Google Agenda", href: "/leads", feito: (reunioesFeitas ?? 0) > 0 },
  ];

  const leads = leadsRaw ?? [];
  const nomes = new Map(leads.map((l) => [l.id as string, l as { name: string; company: string }]));
  const novos30 = leads.filter((l) => agora - new Date(l.created_at).getTime() < 30 * DIA).length;
  const novos60 = leads.filter((l) => {
    const d = agora - new Date(l.created_at).getTime();
    return d >= 30 * DIA && d < 60 * DIA;
  }).length;
  const contatados = leads.filter((l) => l.status !== "Novo").length;
  const responderam = leads.filter((l) => l.status === "Respondeu" || l.status === "Reunião marcada").length;
  const comReuniao = leads.filter((l) => l.status === "Reunião marcada").length;
  const proximas = reunioes.filter((r) => new Date(r.end).getTime() >= agora).sort((a, b) => a.start.localeCompare(b.start));
  const semana = proximas.filter((r) => new Date(r.start).getTime() - agora < 7 * DIA).length;
  const abertas = tarefas.filter((t) => !t.feita).sort((a, b) => (a.vence ?? "9").localeCompare(b.vence ?? "9"));
  const hoje = new Date().toISOString().slice(0, 10);
  const atrasadas = abertas.filter((t) => t.vence && t.vence.slice(0, 10) < hoje).length;

  const funil = [
    { label: "Leads", value: leads.length, pct: 100 },
    { label: "Contatados", value: contatados, pct: pct(contatados, leads.length) },
    { label: "Responderam", value: responderam, pct: pct(responderam, leads.length) },
    { label: "Reuniões", value: comReuniao, pct: pct(comReuniao, leads.length) },
  ];
  const eventos: EventoLead[] = (eventosRaw ?? []).map((e) => ({ id: e.id, leadId: e.lead_id, type: e.type, payload: e.payload ?? {}, createdAt: e.created_at }));

  return (
    <>
      <PageHeader
        index="01"
        title="Visão geral"
        description="Resumo da sua prospecção nos últimos 30 dias, com os dados do seu workspace."
        action={<Prospecta3D quality="low" className="-my-8 hidden size-[220px] md:block" />}
      />


      <PrimeirosPassos passos={passos} />

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Destaque principal */}
        <Reveal index={0} className="lg:col-span-7">
          <Glass className="relative h-full overflow-hidden p-7 lg:min-h-[340px]">
            <WireArt kind="orbit" spin className="absolute -right-16 -top-16 size-[26rem] text-night opacity-20" />
            <Micro>Novos leads (30 dias)</Micro>
            <p className="mt-6 text-[7rem] font-light leading-none tracking-[-0.06em] md:text-[10rem]">
              <CountUp value={novos30} duration={1.8} />
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="rounded-full bg-night px-3 py-1 font-mono text-xs text-neon">{sinal(novos30 - novos60)}</span>
              <span className="text-sm opacity-55">vs. 30 dias anteriores · {leads.length} no total</span>
            </div>
          </Glass>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5">
          <Reveal index={1} className="sm:col-span-2">
            <Aura tone="lime" className="relative h-full min-h-[170px] p-6">
              <WireArt kind="waves" className="absolute inset-0 size-full text-night opacity-25" />
              <Micro className="relative !opacity-70">Taxa de resposta</Micro>
              <p className="relative mt-6 text-6xl font-light tracking-[-0.05em]">{pct(responderam, contatados).toLocaleString("pt-BR")}%</p>
              <p className="relative mt-2 font-mono text-xs">
                {responderam} de {contatados} contatados
              </p>
            </Aura>
          </Reveal>
          <Reveal index={2}>
            <Aura tone="sun" className="relative h-full min-h-[160px] p-6">
              <WireArt kind="fan" className="absolute -bottom-6 -right-6 size-40 text-night opacity-25" />
              <Micro className="relative !opacity-70">Reuniões agendadas</Micro>
              <p className="relative mt-5 text-5xl font-light tracking-[-0.05em]">
                <CountUp value={proximas.length} />
              </p>
              <p className="relative mt-2 font-mono text-xs">{semana} nos próximos 7 dias</p>
            </Aura>
          </Reveal>
          <Reveal index={3}>
            <Aura tone="night" className="relative h-full min-h-[160px] p-6">
              <WireArt kind="rings" className="absolute -bottom-8 -right-8 size-40 text-neon opacity-30" />
              <Micro className="relative !opacity-60">E-mails (30 dias)</Micro>
              <p className="relative mt-5 text-5xl font-light tracking-[-0.05em]">
                <CountUp value={emails.enviados} />
              </p>
              <p className="relative mt-2 font-mono text-xs text-neon">
                {pct(emails.abertos, emails.enviados).toLocaleString("pt-BR")}% abertos · {emails.followups} follow-ups
              </p>
            </Aura>
          </Reveal>
        </div>

        {/* Funil */}
        <Reveal index={4} className="lg:col-span-7">
          <Glass className="h-full p-7">
            <div className="flex items-center justify-between">
              <Micro>Funil de prospecção</Micro>
              <Link href="/leads" className="flex items-center gap-1 text-xs opacity-60 hover:opacity-100">
                Abrir pipeline <ArrowUpRight size={13} aria-hidden />
              </Link>
            </div>
            <ul className="mt-6 space-y-6">
              {funil.map((f, i) => (
                <li key={f.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="flex items-center gap-3 text-sm">
                      <span className="font-mono text-[10px] opacity-40">{String(i + 1).padStart(2, "0")}</span>
                      {f.label}
                    </span>
                    <span className="text-3xl font-light tracking-[-0.04em] tabular-nums">
                      <CountUp value={f.value} />
                    </span>
                  </div>
                  <div className="relative mt-2 h-px bg-night/15">
                    <div className="absolute inset-y-0 left-0 h-[3px] -translate-y-px bg-night" style={{ width: `${Math.max(f.pct, 1.5)}%` }} />
                    <div className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-neon ring-1 ring-night" style={{ left: `calc(${Math.max(f.pct, 1.5)}% - 5px)` }} />
                  </div>
                </li>
              ))}
            </ul>
            {/* números de e-mail e portfólio */}
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Send, t: "Enviados", v: emails.enviados },
                { icon: MailOpen, t: "Abertos", v: emails.abertos },
                { icon: CircleAlert, t: "Responderam", v: emails.respondidos },
                { icon: Eye, t: "Visitas ao portfólio", v: portfolio.total },
              ].map(({ icon: Icon, t, v }) => (
                <div key={t} className="rounded-2xl border border-night/10 bg-white/50 p-3">
                  <Icon size={14} aria-hidden className="opacity-50" />
                  <p className="mt-2 text-2xl font-light tracking-[-0.04em] tabular-nums">{v}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest opacity-50">{t}</p>
                </div>
              ))}
            </div>
          </Glass>
        </Reveal>

        {/* Atividade */}
        <Reveal index={5} className="lg:col-span-5">
          <Glass className="h-full p-7">
            <Micro>Atividade recente</Micro>
            {eventos.length ? (
              <ol className="relative mt-6 space-y-5 border-l border-night/15 pl-6">
                {eventos.map((e) => {
                  const d = descreverEvento(e);
                  const l = nomes.get(e.leadId);
                  return (
                    <li key={e.id} className="relative text-sm">
                      <span className={`absolute -left-[29px] top-1.5 size-2 rounded-full ${TOM[d.tom]}`} />
                      <span className="font-medium">{l ? `${l.name} · ${l.company}` : "Lead"}</span> <span className="opacity-60">— {d.titulo.charAt(0).toLowerCase() + d.titulo.slice(1)}</span>
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-widest opacity-40">{haQuanto(e.createdAt)}</span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-6 text-sm opacity-60">Sem atividade ainda.</p>
            )}
          </Glass>
        </Reveal>

        {/* Radar de novas empresas */}
        {radarRes && (
          <Reveal index={6} className="lg:col-span-12">
            <RadarCard items={radarRes.items} total={radarRes.total} dias={radarRes.dias} mostrar={LIMITES[plano].radarItens} temPerfil={!!perfil && perfil.nichos.length > 0} />
          </Reveal>
        )}

        {/* Próximas reuniões */}
        <Reveal index={6} className="lg:col-span-6">
          <Glass className="h-full p-7">
            <div className="flex items-center justify-between">
              <Micro>Próximas reuniões</Micro>
              <CalendarDays size={16} aria-hidden className="opacity-40" />
            </div>
            {proximas.length ? (
              <ul className="mt-5 space-y-2.5">
                {proximas.slice(0, 5).map((r) => {
                  const c = categoria(r.category);
                  const ini = new Date(r.start);
                  const l = nomes.get(r.leadId);
                  return (
                    <li key={r.id} className="flex items-center gap-4 rounded-[18px] bg-white/60 p-3">
                      <span className="flex w-14 shrink-0 flex-col items-center rounded-xl py-1.5" style={{ background: c.cor, color: c.texto }}>
                        <span className="font-mono text-[9px] uppercase">{ini.toLocaleDateString("pt-BR", { month: "short" })}</span>
                        <span className="text-xl font-medium leading-none">{ini.getDate()}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{r.title}</span>
                        <span className="block truncate text-xs opacity-55">
                          {ini.toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                          {l ? ` · ${l.name}` : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-5 text-sm opacity-60">Nenhuma reunião marcada. Agende pelo pipeline.</p>
            )}
          </Glass>
        </Reveal>

        {/* Tarefas */}
        <Reveal index={7} className="lg:col-span-6">
          <Glass className="h-full p-7">
            <div className="flex items-center justify-between">
              <Micro>Tarefas em aberto</Micro>
              <span className="flex items-center gap-2">
                {atrasadas > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-0.5 font-mono text-[10px] text-rose-800">{atrasadas} atrasada{atrasadas > 1 ? "s" : ""}</span>}
                <ListTodo size={16} aria-hidden className="opacity-40" />
              </span>
            </div>
            {abertas.length ? (
              <ul className="mt-5 space-y-2">
                {abertas.slice(0, 6).map((t) => {
                  const l = nomes.get(t.leadId);
                  const atrasada = t.vence && t.vence.slice(0, 10) < hoje;
                  return (
                    <li key={t.id} className={`flex items-center gap-3 rounded-[18px] border bg-white/60 p-3 ${atrasada ? "border-rose-300" : "border-transparent"}`}>
                      <span className="size-4 shrink-0 rounded-full border border-night/30" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{t.titulo}</span>
                        {l && <span className="block truncate text-xs opacity-55">{l.name} · {l.company}</span>}
                      </span>
                      {t.vence && <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] ${atrasada ? "bg-rose-100 text-rose-800" : "bg-night/5"}`}>{new Date(t.vence).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-5 text-sm opacity-60">Nenhuma tarefa. Crie lembretes no painel de cada lead.</p>
            )}
          </Glass>
        </Reveal>
      </div>
    </>
  );
}
