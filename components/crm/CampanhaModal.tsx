"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleCheck, Clock3, Loader2, Mail, Search, Send, Sparkles, X } from "lucide-react";
import { STATUSES, type Lead, type Status } from "@/lib/lead-types";
import { completar, preencherEmail, type Portfolio } from "@/lib/portfolio-types";
import { VARIAVEIS_EMAIL } from "@/lib/lead-events";
import { carregarPortfolio } from "@/app/(app)/portfolio/actions";
import { configuracaoEmail, enviarEmails, type ConfigEmail } from "@/app/(app)/leads/emails";
import { escreverComIA, iaDisponivel } from "@/app/(app)/leads/abordagem";
import { COR_ETAPA } from "./Pipeline";

const FOLLOWUP_PADRAO = "Oi, {nome}! Passando para saber se conseguiu ver minha mensagem anterior.\n\nSe fizer sentido, te mostro em 15 minutos como funcionaria na {empresa}. Qual o melhor horário?\n\n{meu_nome}";
const DIAS = [2, 3, 5, 7];
const valido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

/** Disparo de e-mail para um ou vários leads, com follow-up automático. */
export default function CampanhaModal({
  leads,
  inicial,
  onFechar,
  onEnviado,
}: {
  leads: Lead[];
  inicial: string[];
  onFechar: () => void;
  onEnviado: (ids: string[]) => void;
}) {
  const [cfg, setCfg] = useState<ConfigEmail | null>(null);
  const [port, setPort] = useState<Portfolio>(completar(null));
  const [sel, setSel] = useState<Set<string>>(new Set(inicial));
  const [etapa, setEtapa] = useState<Status | "todas">("todas");
  const [busca, setBusca] = useState("");
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [follow, setFollow] = useState(true);
  const [dias, setDias] = useState(3);
  const [followCorpo, setFollowCorpo] = useState(FOLLOWUP_PADRAO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<{ enviados: number; semEmail: number; falharam: number; limitados: number } | null>(null);
  const corpoRef = useRef<HTMLTextAreaElement>(null);
  const [ia, setIa] = useState(false);
  const [escrevendo, setEscrevendo] = useState(false);
  const [pedidoIa, setPedidoIa] = useState("");

  useEffect(() => {
    iaDisponivel().then(setIa).catch(() => setIa(false));
  }, []);

  async function comIA() {
    setEscrevendo(true);
    setErro(null);
    const r = await escreverComIA({ leadId: null, canal: "email", modelo: true, instrucao: pedidoIa }).catch(() => ({ ok: false as const, erro: "Não foi possível falar com a IA." }));
    setEscrevendo(false);
    if (!r.ok) return setErro(r.erro);
    if (r.assunto) setAssunto(r.assunto);
    setCorpo(r.texto);
  }

  useEffect(() => {
    configuracaoEmail().then(setCfg).catch(() => setCfg({ configurado: false, remetente: null }));
    carregarPortfolio()
      .then((p) => {
        setPort(p);
        setAssunto((a) => a || p.email.assunto);
        setCorpo((c) => c || p.email.corpo + (p.compartilhar?.ativo ? "\n\nVeja nosso portfólio: {link_portfolio}" : ""));
      })
      .catch(() => {
        const p = completar(null);
        setAssunto((a) => a || p.email.assunto);
        setCorpo((c) => c || p.email.corpo);
      });
  }, []);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && !enviando && onFechar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onFechar, enviando]);

  const comEmail = useMemo(() => leads.filter((l) => valido(l.email)), [leads]);
  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return comEmail.filter((l) => (etapa === "todas" || l.status === etapa) && (!q || `${l.name} ${l.company}`.toLowerCase().includes(q)));
  }, [comEmail, etapa, busca]);
  const escolhidos = comEmail.filter((l) => sel.has(l.id));
  const exemplo = escolhidos[0] ?? comEmail[0];
  const linkExemplo = port.compartilhar?.ativo ? "oraklo.vercel.app/p/…" : "";
  const previa = (t: string) => preencherEmail(t.replaceAll("{link_portfolio}", linkExemplo), port, exemplo);
  const todasVisiveis = visiveis.length > 0 && visiveis.every((l) => sel.has(l.id));

  function inserir(v: string) {
    const el = corpoRef.current;
    if (!el) return setCorpo((c) => c + v);
    const [a, b] = [el.selectionStart, el.selectionEnd];
    setCorpo((c) => c.slice(0, a) + v + c.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + v.length, a + v.length);
    });
  }

  async function enviar() {
    setEnviando(true);
    setErro(null);
    try {
      const ids = escolhidos.map((l) => l.id);
      const r = await enviarEmails({ leadIds: ids, assunto, corpo, followup: follow ? { dias, assunto: `Re: ${assunto}`, corpo: followCorpo } : null });
      setFeito(r);
      if (r.enviados) onEnviado(ids);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setEnviando(false);
    }
  }

  const mailto = exemplo ? `mailto:${exemplo.email}?subject=${encodeURIComponent(previa(assunto))}&body=${encodeURIComponent(previa(corpo))}` : "#";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-night/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={() => !enviando && onFechar()}>
      <div role="dialog" aria-label="Enviar e-mail" onClick={(e) => e.stopPropagation()} className="previa-in flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[28px] bg-[#f4f4f1] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)] sm:rounded-[28px]">
        <header className="flex items-center gap-3 border-b border-night/10 bg-white/70 px-6 py-4">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-night text-neon">
            <Mail size={18} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-medium leading-tight tracking-[-0.02em]">Enviar e-mail</p>
            <p className="truncate text-xs opacity-55">{cfg?.configurado ? `De ${cfg.remetente} · respostas vão para o seu e-mail` : "Mensagem personalizada para cada lead, com follow-up automático"}</p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onFechar} disabled={enviando} className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-night/5">
            <X size={17} />
          </button>
        </header>

        {feito ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-neon text-night">
              <CircleCheck size={30} />
            </span>
            <p className="text-3xl font-light tracking-[-0.04em]">
              {feito.enviados} e-mail{feito.enviados === 1 ? "" : "s"} enviado{feito.enviados === 1 ? "" : "s"}
            </p>
            <p className="max-w-md text-sm opacity-60">
              {follow && feito.enviados ? `Quem não responder recebe o follow-up em ${dias} dias. ` : ""}
              Aberturas e cliques aparecem no histórico de cada lead.
              {feito.falharam ? ` ${feito.falharam} falharam.` : ""}
              {feito.semEmail ? ` ${feito.semEmail} sem e-mail válido.` : ""}
              {feito.limitados ? ` ${feito.limitados} ficaram para o próximo mês pelo limite do plano Grátis.` : ""}
            </p>
            <button type="button" onClick={onFechar} className="mt-3 min-h-11 cursor-pointer rounded-full bg-night px-6 text-sm font-medium text-white">
              Fechar
            </button>
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[320px_1fr] lg:overflow-hidden">
            {/* destinatários */}
            <section aria-label="Destinatários" className="flex min-h-0 flex-col border-b border-night/10 lg:border-b-0 lg:border-r">
              <div className="space-y-2.5 p-4">
                <div className="flex flex-wrap gap-1.5">
                  {(["todas", ...STATUSES] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setEtapa(s)} className={`flex min-h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[11px] ${etapa === s ? "bg-night text-white" : "bg-white hover:bg-night/5"}`}>
                      {s !== "todas" && <span className="size-1.5 rounded-full" style={{ background: COR_ETAPA[s] }} />}
                      {s === "todas" ? "Todas" : s}
                    </button>
                  ))}
                </div>
                <label className="relative block">
                  <span className="sr-only">Buscar lead</span>
                  <Search size={13} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-45" />
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar lead" className="min-h-9 w-full rounded-full bg-white pl-9 pr-3 text-sm outline-none" />
                </label>
                <label className="flex cursor-pointer items-center gap-2 px-1 text-xs">
                  <input
                    type="checkbox"
                    checked={todasVisiveis}
                    onChange={() =>
                      setSel((s) => {
                        const n = new Set(s);
                        for (const l of visiveis) todasVisiveis ? n.delete(l.id) : n.add(l.id);
                        return n;
                      })
                    }
                    className="size-4 accent-[#0b0b0c]"
                  />
                  Marcar {visiveis.length} visíve{visiveis.length === 1 ? "l" : "is"}
                  <span className="ml-auto font-mono text-[10px] opacity-50">{escolhidos.length} escolhidos</span>
                </label>
              </div>
              <ul className="max-h-64 flex-1 overflow-y-auto border-t border-night/10 lg:max-h-none [scrollbar-width:thin]">
                {visiveis.map((l) => (
                  <li key={l.id}>
                    <label className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${sel.has(l.id) ? "bg-neon/25" : "hover:bg-white/70"}`}>
                      <input
                        type="checkbox"
                        checked={sel.has(l.id)}
                        onChange={() =>
                          setSel((s) => {
                            const n = new Set(s);
                            n.has(l.id) ? n.delete(l.id) : n.add(l.id);
                            return n;
                          })
                        }
                        className="size-4 shrink-0 accent-[#0b0b0c]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{l.name}</span>
                        <span className="block truncate text-[11px] opacity-55">{l.company}</span>
                      </span>
                      <span className="size-2 shrink-0 rounded-full" style={{ background: COR_ETAPA[l.status] }} title={l.status} />
                    </label>
                  </li>
                ))}
                {!visiveis.length && <li className="p-4 text-xs opacity-55">Nenhum lead com e-mail nesse filtro.</li>}
              </ul>
              {leads.length > comEmail.length && <p className="border-t border-night/10 px-4 py-2 text-[11px] opacity-50">{leads.length - comEmail.length} leads sem e-mail ficam de fora.</p>}
            </section>

            {/* mensagem */}
            <section aria-label="Mensagem" className="min-h-0 space-y-4 overflow-y-auto p-5 [scrollbar-width:thin]">
              {cfg && !cfg.configurado && (
                <div className="rounded-[18px] border border-amber-300/60 bg-amber-50 p-4 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <Sparkles size={14} aria-hidden /> Falta ligar o envio automático
                  </p>
                  <p className="mt-1 text-xs leading-relaxed opacity-75">
                    Crie uma conta na Resend, verifique seu domínio e adicione <code className="font-mono">RESEND_API_KEY</code> e <code className="font-mono">EMAIL_FROM</code> nas variáveis da Vercel. Até lá, dá para abrir a mensagem no seu e-mail, um lead por vez.
                  </p>
                </div>
              )}

              {ia && (
                <div className="flex flex-wrap gap-2 rounded-[18px] bg-night p-3">
                  <input
                    value={pedidoIa}
                    onChange={(e) => setPedidoIa(e.target.value)}
                    placeholder="Opcional: diga o foco (ex.: oferecer diagnóstico gratuito)"
                    className="min-h-10 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-xs text-white outline-none placeholder:text-white/40"
                  />
                  <button type="button" onClick={() => void comIA()} disabled={escrevendo} className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-neon px-4 text-xs font-medium text-night disabled:opacity-50">
                    {escrevendo ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} aria-hidden />} Escrever com IA
                  </button>
                </div>
              )}
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-widest opacity-50">Assunto</span>
                <input value={assunto} onChange={(e) => setAssunto(e.target.value)} className="min-h-11 w-full rounded-2xl border border-white bg-white px-4 text-sm outline-none focus:border-night/30" />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest opacity-50">Mensagem</span>
                <textarea ref={corpoRef} value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={9} className="w-full resize-y rounded-2xl border border-white bg-white p-4 text-sm leading-relaxed outline-none focus:border-night/30" />
              </label>
              <div className="flex flex-wrap gap-1.5">
                {VARIAVEIS_EMAIL.map((v) => (
                  <button key={v} type="button" onClick={() => inserir(v)} className="min-h-7 cursor-pointer rounded-full border border-night/10 bg-white px-2.5 font-mono text-[10px] hover:bg-night hover:text-neon">
                    {v}
                  </button>
                ))}
              </div>

              {/* follow-up */}
              <div className={`rounded-[18px] border p-4 transition-colors ${follow ? "border-night bg-night text-white" : "border-white bg-white"}`}>
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} className="size-4 accent-[#b8ff3c]" />
                  <Clock3 size={15} aria-hidden className={follow ? "text-neon" : "opacity-50"} />
                  <span className="text-sm font-medium">Follow-up automático se não responder</span>
                </label>
                {follow && (
                  <div className="mt-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="mr-1 text-white/60">Enviar depois de</span>
                      {DIAS.map((d) => (
                        <button key={d} type="button" onClick={() => setDias(d)} className={`min-h-7 cursor-pointer rounded-full px-3 ${dias === d ? "bg-neon text-night" : "bg-white/10 hover:bg-white/20"}`}>
                          {d} dias
                        </button>
                      ))}
                    </div>
                    <textarea value={followCorpo} onChange={(e) => setFollowCorpo(e.target.value)} rows={4} className="w-full resize-y rounded-2xl bg-white/10 p-3 text-sm leading-relaxed text-white outline-none focus:bg-white/15" />
                    <p className="text-[11px] text-white/50">Para sozinho se o lead responder, marcar reunião ou for marcado como sem interesse.</p>
                  </div>
                )}
              </div>

              {/* prévia */}
              {exemplo && (
                <div className="rounded-[18px] border border-dashed border-night/20 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-widest opacity-50">Prévia para {exemplo.name}</p>
                  <p className="mt-2 text-sm font-medium">{previa(assunto)}</p>
                  <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed opacity-75">{previa(corpo)}</p>
                </div>
              )}
            </section>
          </div>
        )}

        {!feito && (
          <footer className="flex flex-wrap items-center gap-3 border-t border-night/10 bg-white/70 px-6 py-4">
            {erro && (
              <p role="alert" className="text-sm text-rose-700">
                {erro}
              </p>
            )}
            <span className="ml-auto" />
            {cfg && !cfg.configurado ? (
              <a href={mailto} aria-disabled={escolhidos.length !== 1} className={`flex min-h-11 items-center gap-2 rounded-full bg-night px-6 text-sm font-medium text-white ${escolhidos.length === 1 ? "" : "pointer-events-none opacity-40"}`} title="Escolha um lead">
                <Mail size={15} aria-hidden /> Abrir no meu e-mail
              </a>
            ) : (
              <button type="button" onClick={() => void enviar()} disabled={!cfg || enviando || !escolhidos.length || !assunto.trim() || !corpo.trim()} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-neon px-6 text-sm font-medium text-night shadow-[0_14px_30px_-14px_rgba(132,204,22,0.9)] disabled:opacity-40">
                {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} aria-hidden />} Enviar para {escolhidos.length} lead{escolhidos.length === 1 ? "" : "s"}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
