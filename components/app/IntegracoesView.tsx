"use client";

import { useRef, useState } from "react";
import { ArrowDown, Check, CheckCheck, Download, FileSpreadsheet, Loader2, Lock, Plus, Send, Trash2, Webhook, X } from "lucide-react";
import { Glass, Micro } from "@/components/app/ui";
import { WhatsappIcon } from "@/components/brand/Icons";
import { EVENTOS_CRM, type ConfigWorkspace, type EventoCrm } from "@/lib/config-workspace";
import { useConfigAutosave } from "@/lib/useConfigAutosave";
import { testarWebhook } from "@/app/(app)/configuracoes/actions";
import RdStationCard from "./RdStationCard";

const campo = "mt-2 min-h-12 w-full rounded-2xl border border-night/10 bg-white/70 px-4 text-sm outline-none focus:border-night/30";
const VARIAVEIS = ["{nome}", "{empresa}", "{meu_nome}", "{minha_empresa}", "{meu_telefone}", "{link_portfolio}"];
// lead de exemplo para a prévia do WhatsApp
const EXEMPLO: Record<string, string> = {
  "{nome}": "Mariana",
  "{empresa}": "Transportes Litoral",
  "{meu_nome}": "Você",
  "{minha_empresa}": "Sua empresa",
  "{meu_telefone}": "(47) 99999-0000",
  "{link_portfolio}": "oraklo.vercel.app/p/…",
};
const preencher = (t: string) => t.replace(/\{\w+\}/g, (m) => EXEMPLO[m] ?? m);

function Interruptor({ on, onChange, rotulo }: { on: boolean; onChange: (v: boolean) => void; rotulo: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3 text-sm">
      {rotulo}
      <span className="relative inline-flex items-center">
        <input type="checkbox" className="peer sr-only" checked={on} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-7 w-12 rounded-full bg-night/15 transition-colors peer-checked:bg-night" />
        <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 peer-checked:bg-neon" />
      </span>
    </label>
  );
}

function Selo({ tipo }: { tipo: "ok" | "off" | "premium" }) {
  if (tipo === "ok")
    return (
      <span className="flex items-center gap-1 rounded-full bg-neon px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-night">
        <Check size={11} aria-hidden /> Ativo
      </span>
    );
  if (tipo === "premium")
    return (
      <span className="flex items-center gap-1 rounded-full bg-night px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
        <Lock size={10} aria-hidden className="text-neon" /> Premium
      </span>
    );
  return <span className="rounded-full bg-night/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">Desligado</span>;
}

export default function IntegracoesView({ inicial, liberado }: { inicial: ConfigWorkspace; liberado: boolean }) {
  const { c, setC, estado, erro, doServidor } = useConfigAutosave(inicial);
  const [teste, setTeste] = useState<null | "testando" | { ok: boolean; status: number | null }>(null);
  const [modeloAtivo, setModeloAtivo] = useState(0);
  const texto = useRef<HTMLTextAreaElement>(null);
  const m = c.whatsapp.modelos[Math.min(modeloAtivo, c.whatsapp.modelos.length - 1)];
  const iM = Math.min(modeloAtivo, c.whatsapp.modelos.length - 1);

  const alternarEvento = (ev: EventoCrm) =>
    setC((s) => ({ ...s, crm: { ...s.crm, eventos: s.crm.eventos.includes(ev) ? s.crm.eventos.filter((x) => x !== ev) : [...s.crm.eventos, ev] } }));
  const mudarModelo = (campoM: "nome" | "texto", v: string) =>
    setC((s) => ({ ...s, whatsapp: { modelos: s.whatsapp.modelos.map((x, j) => (j === iM ? { ...x, [campoM]: v } : x)) } }));
  function inserir(v: string) {
    const el = texto.current;
    if (!el || !m) return mudarModelo("texto", (m?.texto ?? "") + v);
    const [a, b] = [el.selectionStart, el.selectionEnd];
    mudarModelo("texto", m.texto.slice(0, a) + v + m.texto.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + v.length, a + v.length);
    });
  }

  const opcoes = [
    { id: "rd", t: "RD Station CRM", d: "Integração direta: empresa, contato e negociação", cor: "bg-[#1b2b5b] text-white", icone: <span className="text-sm font-bold">RD</span>, selo: !liberado ? "premium" : c.rd.conectado ? "ok" : "off" },
    { id: "webhook", t: "Zapier, Make e n8n", d: "Webhook para Pipedrive, HubSpot e outros", cor: "bg-night text-neon", icone: <Webhook size={20} aria-hidden />, selo: !liberado ? "premium" : c.crm.ativo && c.crm.webhookUrl ? "ok" : "off" },
    { id: "planilhas", t: "Planilhas por CRM", d: "Exporte no formato de importação", cor: "bg-neon text-night", icone: <FileSpreadsheet size={20} aria-hidden />, selo: liberado ? "ok" : "premium" },
    { id: "whatsapp", t: "WhatsApp", d: `${c.whatsapp.modelos.length} modelos de mensagem`, cor: "bg-[#25d366] text-white", icone: <WhatsappIcon size={20} />, selo: "ok" },
  ] as const;

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 px-1 text-xs opacity-60">
        {estado === "salvando" ? <Loader2 size={12} className="animate-spin" /> : estado === "ok" ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-rose-600" />}
        {estado === "salvando" ? "Salvando…" : estado === "ok" ? "Tudo salvo" : erro}
      </p>

      {/* visão geral das integrações */}
      <section aria-label="Integrações disponíveis" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {opcoes.map((o) => (
          <a key={o.id} href={`#${o.id}`} className="group flex flex-col rounded-[24px] border border-white/80 bg-white/70 p-5 transition-all hover:-translate-y-0.5 hover:bg-white">
            <div className="flex items-start justify-between gap-3">
              <span className={`flex size-12 items-center justify-center rounded-2xl ${o.cor}`}>{o.icone}</span>
              <Selo tipo={o.selo} />
            </div>
            <p className="mt-5 text-lg font-medium leading-tight tracking-[-0.02em]">{o.t}</p>
            <p className="mt-1 text-xs opacity-60">{o.d}</p>
            <span className="mt-4 flex items-center gap-1 text-xs font-medium opacity-60 transition-opacity group-hover:opacity-100">
              Configurar <ArrowDown size={12} aria-hidden />
            </span>
          </a>
        ))}
      </section>

      {!liberado && (
        <p className="flex flex-wrap items-center gap-3 rounded-[20px] bg-night px-5 py-4 text-sm text-white">
          <Lock size={15} aria-hidden className="text-neon" />
          RD Station, webhook e planilhas por CRM fazem parte do Premium. WhatsApp e a planilha completa já estão liberados.
          <a href="/pacotes" className="ml-auto rounded-full bg-neon px-4 py-1.5 text-xs font-medium text-night">
            Ver pacotes
          </a>
        </p>
      )}

      {/* RD Station */}
      <div id="rd" className="scroll-mt-28">
        <RdStationCard c={c} setC={setC} onServidor={doServidor} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* webhook */}
        <Glass className="scroll-mt-28 p-7" >
          <div id="webhook" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-night text-neon">
              <Webhook size={18} aria-hidden />
            </span>
            <div>
              <Micro>Zapier · Make · n8n</Micro>
              <p className="text-sm opacity-60">Manda cada evento para uma automação que cria o lead no seu CRM.</p>
            </div>
          </div>
          <Interruptor rotulo="Enviar eventos para o meu CRM (webhook)" on={c.crm.ativo} onChange={(v) => setC((s) => ({ ...s, crm: { ...s.crm, ativo: v } }))} />
          <label className="block text-sm font-medium">
            Endereço do webhook
            <input className={campo} value={c.crm.webhookUrl} onChange={(e) => setC((s) => ({ ...s, crm: { ...s.crm, webhookUrl: e.target.value } }))} placeholder="https://hooks.zapier.com/hooks/catch/…" />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            {EVENTOS_CRM.map((ev) => {
              const on = c.crm.eventos.includes(ev.id);
              return (
                <button key={ev.id} type="button" onClick={() => alternarEvento(ev.id)} aria-pressed={on} className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs ${on ? "border-night bg-night text-white" : "border-night/10 bg-white/70"}`}>
                  {on && <Check size={11} className="text-neon" aria-hidden />} {ev.t}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!c.crm.webhookUrl || teste === "testando"}
              onClick={async () => {
                setTeste("testando");
                try {
                  setTeste(await testarWebhook(c.crm.webhookUrl));
                } catch {
                  setTeste({ ok: false, status: null });
                }
              }}
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-night/15 px-4 text-xs font-medium hover:bg-white disabled:opacity-40"
            >
              {teste === "testando" ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} aria-hidden />} Enviar teste
            </button>
            {teste && teste !== "testando" && (
              <span className={`text-xs ${teste.ok ? "text-emerald-700" : "text-rose-700"}`}>{teste.ok ? `Recebido (HTTP ${teste.status})` : `Falhou${teste.status ? ` (HTTP ${teste.status})` : ""}`}</span>
            )}
          </div>
          <details className="mt-4 rounded-2xl bg-night/5 p-4 text-xs leading-relaxed">
            <summary className="cursor-pointer font-medium">Como ligar no Pipedrive, HubSpot ou outro CRM</summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-4 opacity-75">
              <li>Crie uma automação no Zapier, Make ou n8n com o gatilho “Webhook” e copie o endereço.</li>
              <li>Cole o endereço aqui, escolha os eventos e clique em “Enviar teste”.</li>
              <li>Na automação, adicione a ação “Criar contato/negócio” do seu CRM e ligue os campos (nome, e-mail, telefone, empresa, etapa).</li>
            </ol>
          </details>
        </Glass>

        {/* planilhas */}
        <Glass className="p-7">
          <div id="planilhas" className="flex scroll-mt-28 items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-neon text-night">
              <FileSpreadsheet size={18} aria-hidden />
            </span>
            <div>
              <Micro>Planilhas por CRM</Micro>
              <p className="text-sm opacity-60">Baixe seus leads no formato que o importador de cada CRM entende.</p>
            </div>
          </div>
          <ul className="mt-6 space-y-2">
            {[
              { f: "rd", t: "RD Station CRM", d: "Nome, e-mail, telefone, cargo, empresa, etapa" },
              { f: "pipedrive", t: "Pipedrive", d: "Pessoa, organização e negócio" },
              { f: "hubspot", t: "HubSpot", d: "Contato com empresa e status do lead" },
              { f: "completo", t: "Planilha completa", d: "Todos os campos, inclusive CNPJ e score" },
            ].map((x) => {
              const bloqueado = !liberado && x.f !== "completo";
              return (
                <li key={x.f}>
                  <a
                    href={bloqueado ? "/pacotes" : `/api/leads/exportar?formato=${x.f}`}
                    className="group flex items-center gap-3 rounded-2xl border border-white bg-white/70 p-3.5 transition-colors hover:border-night/20 hover:bg-white"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{x.t}</span>
                      <span className="block truncate text-xs opacity-55">{x.d}</span>
                    </span>
                    {bloqueado ? (
                      <span className="flex items-center gap-1 rounded-full bg-night px-3 py-1.5 text-[11px] text-white">
                        <Lock size={11} aria-hidden className="text-neon" /> Premium
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 rounded-full bg-night px-3.5 py-1.5 text-[11px] font-medium text-white transition-colors group-hover:bg-neon group-hover:text-night">
                        <Download size={12} aria-hidden /> Baixar CSV
                      </span>
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </Glass>
      </div>

      {/* WhatsApp */}
      <section id="whatsapp" aria-label="Modelos de WhatsApp" className="scroll-mt-28 overflow-hidden rounded-[28px] bg-[#0b2a1f] text-white">
        <div className="grid gap-0 lg:grid-cols-[1fr_400px]">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#25d366] text-white shadow-[0_10px_30px_-10px_rgba(37,211,102,0.9)]">
                  <WhatsappIcon size={22} />
                </span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#25d366]">WhatsApp</p>
                  <h2 className="text-2xl font-light tracking-[-0.03em] md:text-3xl">Modelos de mensagem</h2>
                </div>
              </div>
              <button
                type="button"
                disabled={c.whatsapp.modelos.length >= 12}
                onClick={() => {
                  setC((s) => ({ ...s, whatsapp: { modelos: [...s.whatsapp.modelos, { id: Math.random().toString(36).slice(2, 8), nome: "Novo modelo", texto: "Oi, {nome}! " }] } }));
                  setModeloAtivo(c.whatsapp.modelos.length);
                }}
                className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-[#25d366] px-4 text-xs font-semibold text-[#0b2a1f] disabled:opacity-40"
              >
                <Plus size={13} aria-hidden /> Novo modelo
              </button>
            </div>
            <p className="mt-3 max-w-xl text-sm text-white/60">Aparecem no botão de WhatsApp de cada lead (pipeline e painel do lead). As variáveis viram o nome e a empresa do lead na hora de abrir.</p>

            {/* abas dos modelos */}
            <div role="tablist" className="mt-6 flex flex-wrap gap-2">
              {c.whatsapp.modelos.map((x, j) => (
                <button
                  key={x.id}
                  type="button"
                  role="tab"
                  aria-selected={j === iM}
                  onClick={() => setModeloAtivo(j)}
                  className={`min-h-9 cursor-pointer rounded-full px-4 text-xs font-medium transition-colors ${j === iM ? "bg-white text-[#0b2a1f]" : "bg-white/10 text-white/75 hover:bg-white/15"}`}
                >
                  {x.nome || "Sem nome"}
                </button>
              ))}
            </div>

            {m && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-2">
                  <input value={m.nome} onChange={(e) => mudarModelo("nome", e.target.value)} maxLength={40} aria-label="Nome do modelo" className="min-h-11 min-w-0 flex-1 rounded-2xl bg-white/10 px-4 text-sm font-medium outline-none focus:bg-white/15" />
                  <button
                    type="button"
                    aria-label={`Remover ${m.nome}`}
                    disabled={c.whatsapp.modelos.length <= 1}
                    onClick={() => {
                      setC((s) => ({ ...s, whatsapp: { modelos: s.whatsapp.modelos.filter((_, j) => j !== iM) } }));
                      setModeloAtivo(0);
                    }}
                    className="flex size-11 cursor-pointer items-center justify-center rounded-2xl bg-white/10 hover:bg-rose-500 disabled:opacity-30"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <textarea
                  ref={texto}
                  value={m.texto}
                  onChange={(e) => mudarModelo("texto", e.target.value)}
                  rows={6}
                  maxLength={1000}
                  aria-label="Texto do modelo"
                  className="w-full resize-y rounded-2xl bg-white/10 p-4 text-sm leading-relaxed outline-none focus:bg-white/15"
                />
                <div className="flex flex-wrap gap-1.5">
                  {VARIAVEIS.map((v) => (
                    <button key={v} type="button" onClick={() => inserir(v)} className="min-h-8 cursor-pointer rounded-full border border-[#25d366]/40 px-3 font-mono text-[11px] text-[#25d366] hover:bg-[#25d366] hover:text-[#0b2a1f]">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* prévia como no celular */}
          <div className="flex items-center justify-center bg-[#071d15] p-6 md:p-8">
            <div className="w-full max-w-[330px] overflow-hidden rounded-[30px] border-[6px] border-black bg-[#efeae2] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
              <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
                <span className="flex size-9 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">MC</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium leading-tight">Mariana · Transportes Litoral</span>
                  <span className="block text-[11px] text-white/70">online</span>
                </span>
              </div>
              <div
                className="min-h-[300px] space-y-2 p-3"
                style={{ backgroundImage: "radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
              >
                <p className="mx-auto w-fit rounded-md bg-white/80 px-2 py-0.5 text-[10px] text-black/50">HOJE</p>
                <div className="ml-auto max-w-[88%] rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[13px] leading-snug text-black shadow-sm">
                  <p className="whitespace-pre-line">{m ? preencher(m.texto) || "…" : "…"}</p>
                  <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-black/45">
                    09:41 <CheckCheck size={13} className="text-[#53bdeb]" aria-hidden />
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#f0f0f0] px-3 py-2">
                <span className="h-8 flex-1 rounded-full bg-white" />
                <span className="flex size-8 items-center justify-center rounded-full bg-[#00a884] text-white">
                  <Send size={13} aria-hidden />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
