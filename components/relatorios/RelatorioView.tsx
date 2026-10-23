import { corCss } from "@/lib/colors";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Lock, Clock3, Mail, MailOpen, MessageSquareReply, MousePointerClick, Repeat2, TriangleAlert } from "lucide-react";
import { Aura, Glass, Micro, WireArt } from "@/components/app/ui";
import type { Relatorio } from "@/lib/relatorios";
import { GraficoAtividade, MapaHorarios } from "./Graficos";
import Agrupamentos from "./Agrupamentos";

const TONS = ["night", "lime", "sun", "mint"] as const;
const ARTE = ["rings", "waves", "fan", "orbit"] as const;
const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const fmtPct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const PERIODOS = [
  { k: "7", t: "7 dias" },
  { k: "30", t: "30 dias" },
  { k: "90", t: "90 dias" },
] as const;

function Variacao({ valor, anterior, formato, escuro }: { valor: number; anterior: number; formato?: "pct"; escuro?: boolean }) {
  const diff = formato === "pct" ? valor - anterior : anterior ? ((valor - anterior) / anterior) * 100 : valor ? 100 : 0;
  const texto = formato === "pct" ? `${diff >= 0 ? "+" : ""}${diff.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} pp` : `${diff >= 0 ? "+" : ""}${Math.round(diff)}%`;
  const Icone = diff >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`relative inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[11px] ${escuro ? "bg-neon text-night" : "bg-night text-neon"}`}>
      <Icone size={12} aria-hidden /> {texto}
    </span>
  );
}

export default function RelatorioView({ r, completo = true }: { r: Relatorio; completo?: boolean }) {
  const p = r.periodo;
  const e = r.email;
  const totalSerie = r.serie.reduce((s, b) => s + b.contatados + b.respostas + b.reunioes, 0);
  const topoFunil = Math.max(1, r.funil[0]?.valor ?? 0);

  return (
    <div id="relatorio" className="space-y-4">
      {/* período */}
      <Glass className="flex flex-wrap items-center gap-3 p-3 print:hidden">
        <div className="flex gap-1 rounded-full bg-night/5 p-1">
          {PERIODOS.map((o) => (
            <Link
              key={o.k}
              href={`/relatorios?periodo=${o.k}`}
              scroll={false}
              className={`flex min-h-9 items-center rounded-full px-4 text-xs font-medium transition-colors ${p.chave === o.k ? "bg-night text-white" : "hover:bg-white"}`}
            >
              {o.t}
            </Link>
          ))}
        </div>
        <form action="/relatorios" className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="periodo" value="custom" />
          <label className="flex items-center gap-2 text-xs">
            <span className="opacity-55">De</span>
            <input type="date" name="de" defaultValue={p.de} className="min-h-9 rounded-full border border-night/10 bg-white/80 px-3 text-xs" />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <span className="opacity-55">até</span>
            <input type="date" name="ate" defaultValue={p.ate} className="min-h-9 rounded-full border border-night/10 bg-white/80 px-3 text-xs" />
          </label>
          <button type="submit" className={`min-h-9 cursor-pointer rounded-full px-4 text-xs font-medium ${p.chave === "custom" ? "bg-night text-white" : "border border-night/15 hover:bg-white"}`}>
            Aplicar
          </button>
        </form>
        <span className="ml-auto pr-2 font-mono text-[10px] uppercase tracking-widest opacity-50">{p.rotulo} · comparado ao período anterior</span>
      </Glass>

      {/* cabeçalho só na impressão */}
      <div className="hidden print:block">
        <p className="text-3xl font-light tracking-[-0.04em]">Relatório de prospecção</p>
        <p className="text-sm opacity-60">{p.rotulo} · comparado ao período anterior</p>
      </div>

      {/* 1. indicadores */}
      <section aria-label="Indicadores" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {r.kpis.map((k, i) => (
          <Aura key={k.rotulo} tone={TONS[i]} className="relative min-h-[160px] p-6">
            <WireArt kind={ARTE[i]} className={`absolute -bottom-6 -right-6 size-32 opacity-25 ${TONS[i] === "night" ? "text-neon" : "text-night"}`} />
            <Micro className="relative !opacity-70">{k.rotulo}</Micro>
            <p className="relative mt-5 text-5xl font-light leading-none tracking-[-0.05em] tabular-nums">{k.formato === "pct" ? fmtPct(k.valor) : k.valor.toLocaleString("pt-BR")}</p>
            <div className="relative mt-3 flex flex-wrap items-center gap-2">
              <Variacao valor={k.valor} anterior={k.anterior} formato={k.formato} escuro={TONS[i] === "night"} />
              <span className={`text-[11px] ${TONS[i] === "night" ? "text-white/50" : "opacity-55"}`}>antes: {k.formato === "pct" ? fmtPct(k.anterior) : k.anterior}</span>
            </div>
          </Aura>
        ))}
      </section>

      {/* atividade no tempo */}
      <Glass className="p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Micro>Atividade por {r.granularidade}</Micro>
            <p className="mt-2 text-sm opacity-60">Quantos leads foram contatados, responderam e marcaram reunião.</p>
          </div>
        </div>
        <div className="mt-6">{totalSerie ? <GraficoAtividade serie={r.serie} /> : <Vazio texto="Sem atividade nesse período. Mova leads no pipeline ou dispare e-mails para ver a evolução aqui." />}</div>
      </Glass>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* 2. funil com conversão */}
        <Glass className="p-7 lg:col-span-7">
          <Micro>Funil com conversão</Micro>
          <p className="mt-2 text-sm opacity-60">Dos leads que entraram no período, quantos chegaram a cada etapa.</p>
          {r.funil[0].valor ? (
            <>
              <ol className="mt-6 space-y-3">
                {r.funil.map((f, i) => (
                  <li key={f.rotulo}>
                    {f.conversao !== null && (
                      <p className={`mb-2 ml-4 flex items-center gap-2 font-mono text-[10px] ${r.maiorVazamento?.para === f.rotulo ? "text-danger-600" : "opacity-50"}`}>
                        <span className="h-3 w-px bg-current" /> {fmtPct(f.conversao)} passaram
                      </p>
                    )}
                    <div className="relative flex min-h-12 items-center overflow-hidden rounded-2xl bg-night/5">
                      <div
                        className="barra-larga absolute inset-y-0 left-0 rounded-2xl"
                        style={{ width: `${Math.max(2, (f.valor / topoFunil) * 100)}%`, background: i === r.funil.length - 1 ? corCss("neon") : corCss("sombra", 0.9 - i * 0.2), animationDelay: `${i * 90}ms` }}
                      />
                      <span className={`relative flex w-full items-center justify-between px-4 text-sm ${i < r.funil.length - 1 && f.valor / topoFunil > 0.35 ? "text-branco" : ""}`}>
                        <span className="flex items-center gap-3">
                          <span className="font-mono text-[10px] opacity-60">{String(i + 1).padStart(2, "0")}</span>
                          {f.rotulo}
                        </span>
                      </span>
                      <span className={`relative mr-4 shrink-0 text-2xl font-light tracking-[-0.04em] tabular-nums ${i < r.funil.length - 1 && f.valor / topoFunil > 0.92 ? "text-neon" : ""}`}>{f.valor}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap gap-2 text-xs">
                {r.maiorVazamento && r.maiorVazamento.perda > 0 && (
                  <span className="flex items-center gap-2 rounded-full bg-danger-50 px-3 py-1.5 text-danger-800">
                    <TriangleAlert size={13} aria-hidden /> Maior vazamento: {r.maiorVazamento.de} → {r.maiorVazamento.para} ({fmtPct(r.maiorVazamento.perda)} ficam)
                  </span>
                )}
                <span className="rounded-full bg-night/5 px-3 py-1.5">{r.perdidos} sem interesse</span>
              </div>
            </>
          ) : (
            <Vazio texto="Nenhum lead entrou no funil nesse período." />
          )}
        </Glass>

        {/* 5. score × resultado */}
        <Bloqueado ativo={!completo} className="lg:col-span-5">
        <Glass className="h-full p-7">
          <Micro>Score × resultado</Micro>
          <p className="mt-2 text-sm opacity-60">Os leads “Quentes” respondem mais? Taxa de resposta e de reunião por faixa.</p>
          {r.score.some((s) => s.leads) ? (
            <>
              <ul className="mt-6 space-y-5">
                {r.score.map((s) => (
                  <li key={s.rotulo}>
                    <div className="flex items-baseline justify-between">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <span className="tema-original rounded-full px-2.5 py-0.5 font-mono text-[10px] text-night" style={{ background: s.cor }}>
                          {s.rotulo}
                        </span>
                        <span className="font-mono text-[11px] font-normal opacity-50">{s.leads} leads</span>
                      </span>
                      <span className="text-xl font-light tracking-[-0.03em] tabular-nums">{fmtPct(pct(s.respostas, s.leads))}</span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <Barra rotulo="Resposta" valor={pct(s.respostas, s.leads)} cor={corCss("night")} />
                      <Barra rotulo="Reunião" valor={pct(s.reunioes, s.leads)} cor={corCss("neon")} />
                    </div>
                  </li>
                ))}
              </ul>
              {r.scoreMedio.responderam !== null && r.scoreMedio.naoResponderam !== null && (
                <p className="mt-6 rounded-2xl bg-night/5 p-3 text-xs leading-relaxed">
                  Score médio de quem respondeu: <strong>{r.scoreMedio.responderam}</strong> · de quem não respondeu: <strong>{r.scoreMedio.naoResponderam}</strong>.{" "}
                  {r.scoreMedio.responderam > r.scoreMedio.naoResponderam ? "O score está acertando — priorize os Quentes." : "O score ainda não separa bem quem responde; vale olhar os segmentos."}
                </p>
              )}
            </>
          ) : (
            <Vazio texto="Sem leads no período para comparar." />
          )}
        </Glass>
        </Bloqueado>
      </div>

      {/* 3. e-mails */}
      <Bloqueado ativo={!completo}>
      <Glass className="p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Micro>Desempenho dos e-mails</Micro>
            <p className="mt-2 text-sm opacity-60">Envios, aberturas, cliques, respostas e o efeito do follow-up.</p>
          </div>
          {e.melhor && (
            <span className="flex items-center gap-2 rounded-full bg-night px-4 py-2 text-xs text-white">
              <Clock3 size={13} aria-hidden className="text-neon" /> Melhor horário: <strong className="text-neon">{e.melhor.dia}, {e.melhor.hora}</strong>
            </span>
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { icon: Mail, t: "Enviados", v: String(e.enviados), s: `+ ${e.followups} follow-ups` },
            { icon: MailOpen, t: "Abertos", v: fmtPct(pct(e.abertos, e.enviados + e.followups)), s: `${e.abertos} e-mails` },
            { icon: MousePointerClick, t: "Cliques", v: fmtPct(pct(e.cliques, e.enviados + e.followups)), s: `${e.cliques} e-mails` },
            { icon: MessageSquareReply, t: "Responderam", v: fmtPct(pct(e.respondidos, e.enviados)), s: `${e.respondidos} leads` },
            { icon: Repeat2, t: "Graças ao follow-up", v: String(e.respostasAposFollowup), s: e.respondidos ? `${fmtPct(pct(e.respostasAposFollowup, e.respondidos))} das respostas` : "respostas" },
          ].map(({ icon: Icon, t, v, s }) => (
            <div key={t} className="rounded-2xl border border-white/80 bg-white/60 p-4">
              <Icon size={15} aria-hidden className="opacity-50" />
              <p className="mt-3 text-3xl font-light tracking-[-0.04em] tabular-nums">{v}</p>
              <p className="font-mono text-[9px] uppercase tracking-widest opacity-50">{t}</p>
              <p className="mt-1 text-[11px] opacity-55">{s}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-sm font-medium">Quando os leads abrem e respondem</p>
            <p className="text-xs opacity-55">Horário de Brasília · respostas contam mais que aberturas</p>
          </div>
          <MapaHorarios mapa={e.mapa} />
        </div>
        {!e.enviados && !e.followups && <p className="mt-4 text-xs opacity-55">Nenhum e-mail enviado pelo Oraklo nesse período. Use “Disparar e-mails” em Leads.</p>}
      </Glass>
      </Bloqueado>

      {/* 4. segmento / cidade / porte */}
      <Bloqueado ativo={!completo}>
      <Glass className="p-7">
        <Micro>Onde vale mais a pena prospectar</Micro>
        <p className="mb-5 mt-2 text-sm opacity-60">Resposta e reunião por segmento (CNAE), cidade e porte, dos leads que entraram no período.</p>
        <Agrupamentos segmentos={r.segmentos} cidades={r.cidades} portes={r.portes} />
      </Glass>
      </Bloqueado>
    </div>
  );
}

/** Seção do Premium: fica visível, com um selo pequeno no canto para liberar. */
function Bloqueado({ ativo, className = "", children }: { ativo: boolean; className?: string; children: React.ReactNode }) {
  if (!ativo) return <div className={className}>{children}</div>;
  return (
    <div className={`relative ${className}`}>
      {children}
      <a
        href="/pacotes"
        title="Exportação e dados completos no Premium"
        className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-night py-1.5 pl-2.5 pr-3 text-[11px] font-medium text-white shadow-[0_10px_24px_-12px_color-mix(in_srgb,var(--color-black)_70%,transparent)] transition-transform hover:-translate-y-0.5 print:hidden"
      >
        <Lock size={11} aria-hidden className="text-neon" /> Premium
      </a>
    </div>
  );
}

function Barra({ rotulo, valor, cor }: { rotulo: string; valor: number; cor: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-14 font-mono text-[9px] uppercase tracking-widest opacity-45">{rotulo}</span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-night/8">
        <span className="barra-larga absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, valor)}%`, background: cor }} />
      </span>
      <span className="w-12 text-right font-mono text-[10px] tabular-nums opacity-60">{fmtPct(valor)}</span>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="mt-6 rounded-2xl border border-dashed border-night/15 px-5 py-10 text-center text-sm opacity-60">{texto}</p>;
}
