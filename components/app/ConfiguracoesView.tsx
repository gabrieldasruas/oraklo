"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Loader2, Plug, Plus, Send, Trash2, UserPlus, X } from "lucide-react";
import { Glass, Micro } from "@/components/app/ui";
import { WhatsappIcon } from "@/components/brand/Icons";
import { EVENTOS_CRM, type ConfigWorkspace, type EventoCrm } from "@/lib/config-workspace";
import { renomearWorkspace, salvarConfig, salvarNome, testarWebhook } from "@/app/(app)/configuracoes/actions";

type Limites = { pipelineMes: number | null; emailsMes: number | null; iaMes: number | null; radarItens: number | null };
type Props = {
  inicial: ConfigWorkspace;
  usuario: { nome: string; email: string; workspace: string };
  plano: { id: "gratis" | "pro"; nome: string; limites: Limites; uso: { pipeline: number; emails: number; ia: number } };
  membros: number;
  emailContato: string;
};

const campo = "mt-2 min-h-12 w-full rounded-2xl border border-night/10 bg-white/70 px-4 text-sm outline-none focus:border-night/30";

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

function BarraUso({ rotulo, usado, limite }: { rotulo: string; usado: number; limite: number | null }) {
  const pct = limite ? Math.min(100, (usado / limite) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{rotulo}</span>
        <span className="font-mono text-xs tabular-nums opacity-70">{limite === null ? `${usado} · ilimitado` : `${usado} de ${limite}`}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-night/10">
        <div className={`h-full rounded-full ${pct >= 90 ? "bg-rose-500" : "bg-night"}`} style={{ width: `${limite === null ? 8 : pct}%` }} />
      </div>
    </div>
  );
}

export default function ConfiguracoesView({ inicial, usuario, plano, membros, emailContato }: Props) {
  const [c, setC] = useState(inicial);
  const [estado, setEstado] = useState<"ok" | "salvando" | "erro">("ok");
  const [erro, setErro] = useState<string | null>(null);
  const ultimo = useRef(JSON.stringify(inicial));
  const [nome, setNome] = useState(usuario.nome);
  const [empresa, setEmpresa] = useState(usuario.workspace);
  const [perfilMsg, setPerfilMsg] = useState<string | null>(null);
  const [teste, setTeste] = useState<null | "testando" | { ok: boolean; status: number | null }>(null);

  // salva sozinho
  useEffect(() => {
    const atual = JSON.stringify(c);
    if (atual === ultimo.current) return;
    setEstado("salvando");
    setErro(null);
    const t = setTimeout(() => {
      salvarConfig(c)
        .then((salvo) => {
          ultimo.current = JSON.stringify(salvo);
          setEstado("ok");
        })
        .catch((e) => {
          setEstado("erro");
          setErro(e instanceof Error ? e.message : "Não foi possível salvar");
        });
    }, 900);
    return () => clearTimeout(t);
  }, [c]);

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setPerfilMsg(null);
    try {
      if (nome !== usuario.nome) await salvarNome(nome);
      if (empresa !== usuario.workspace) await renomearWorkspace(empresa);
      setPerfilMsg("Salvo");
    } catch (err) {
      setPerfilMsg(err instanceof Error ? err.message : "Não foi possível salvar");
    }
  }

  const alternarEvento = (ev: EventoCrm) =>
    setC((s) => ({ ...s, crm: { ...s.crm, eventos: s.crm.eventos.includes(ev) ? s.crm.eventos.filter((x) => x !== ev) : [...s.crm.eventos, ev] } }));
  const modelo = (i: number, campo: "nome" | "texto", v: string) =>
    setC((s) => ({ ...s, whatsapp: { modelos: s.whatsapp.modelos.map((m, j) => (j === i ? { ...m, [campo]: v } : m)) } }));

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 px-1 text-xs opacity-60">
        {estado === "salvando" ? <Loader2 size={12} className="animate-spin" /> : estado === "ok" ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-rose-600" />}
        {estado === "salvando" ? "Salvando…" : estado === "ok" ? "Tudo salvo" : erro}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* perfil */}
        <Glass className="p-7">
          <Micro>01 · Perfil</Micro>
          <form onSubmit={salvarPerfil} className="mt-5 space-y-4">
            <label className="block text-sm font-medium">
              Seu nome
              <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} />
            </label>
            <label className="block text-sm font-medium">
              E-mail
              <input className={`${campo} opacity-60`} value={usuario.email} readOnly />
            </label>
            <label className="block text-sm font-medium">
              Empresa (nome do workspace)
              <input className={campo} value={empresa} onChange={(e) => setEmpresa(e.target.value)} maxLength={80} />
            </label>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={nome === usuario.nome && empresa === usuario.workspace} className="min-h-11 cursor-pointer rounded-full bg-night px-5 text-sm font-medium text-white disabled:opacity-40">
                Salvar perfil
              </button>
              {perfilMsg && <span className="text-xs opacity-70">{perfilMsg}</span>}
            </div>
          </form>
        </Glass>

        {/* plano */}
        <Glass className="p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Micro>02 · Plano e uso do mês</Micro>
              <p className="mt-3 text-4xl font-light tracking-[-0.04em]">{plano.nome}</p>
            </div>
            {plano.id === "gratis" && (
              <a href={`mailto:${emailContato}?subject=${encodeURIComponent("Quero o plano Profissional")}`} className="min-h-10 rounded-full bg-neon px-4 py-2.5 text-xs font-medium text-night">
                Liberar Profissional
              </a>
            )}
          </div>
          <div className="mt-6 space-y-5">
            <BarraUso rotulo="Empresas no pipeline" usado={plano.uso.pipeline} limite={plano.limites.pipelineMes} />
            <BarraUso rotulo="E-mails disparados" usado={plano.uso.emails} limite={plano.limites.emailsMes} />
            <BarraUso rotulo="Textos escritos com IA" usado={plano.uso.ia} limite={plano.limites.iaMes} />
          </div>
          <p className="mt-6 text-xs opacity-55">
            Equipe: {membros} {membros === 1 ? "pessoa" : "pessoas"} no workspace.{" "}
            <span className="inline-flex items-center gap-1">
              <UserPlus size={12} aria-hidden /> Convites para colegas chegam em breve.
            </span>
          </p>
        </Glass>

        {/* assinatura */}
        <Glass className="p-7">
          <Micro>03 · Assinatura dos e-mails</Micro>
          <p className="mt-2 text-sm opacity-60">Vai no fim de todo e-mail e follow-up disparado pelo Oraklo.</p>
          <textarea
            value={c.assinatura}
            onChange={(e) => setC((s) => ({ ...s, assinatura: e.target.value }))}
            rows={5}
            maxLength={600}
            placeholder={"Gabriel Senhas\nOraklo · (47) 99999-0000\noraklo.vercel.app"}
            className="mt-4 w-full resize-y rounded-2xl border border-night/10 bg-white/70 p-4 text-sm leading-relaxed outline-none focus:border-night/30"
          />
          <div className="mt-4 border-t border-night/10 pt-2">
            <Micro>Notificações</Micro>
            <Interruptor rotulo="Radar: avisar sobre empresas novas no meu perfil" on={c.notificar.radar} onChange={(v) => setC((s) => ({ ...s, notificar: { ...s.notificar, radar: v } }))} />
            <Interruptor rotulo="Resumo semanal por e-mail" on={c.notificar.resumoSemanal} onChange={(v) => setC((s) => ({ ...s, notificar: { ...s.notificar, resumoSemanal: v } }))} />
          </div>
        </Glass>

        {/* CRM */}
        <Glass className="p-7">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-night text-neon">
              <Plug size={18} aria-hidden />
            </span>
            <div>
              <Micro>04 · Integração com CRM</Micro>
              <p className="text-sm opacity-60">Manda cada lead para o seu CRM automaticamente.</p>
            </div>
          </div>
          <Interruptor rotulo="Enviar eventos para o meu CRM (webhook)" on={c.crm.ativo} onChange={(v) => setC((s) => ({ ...s, crm: { ...s.crm, ativo: v } }))} />
          <label className="block text-sm font-medium">
            Endereço do webhook
            <input
              className={campo}
              value={c.crm.webhookUrl}
              onChange={(e) => setC((s) => ({ ...s, crm: { ...s.crm, webhookUrl: e.target.value } }))}
              placeholder="https://hooks.zapier.com/hooks/catch/…"
            />
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
            <summary className="cursor-pointer font-medium">Como ligar no RD Station, Pipedrive ou HubSpot</summary>
            <ol className="mt-3 list-decimal space-y-1.5 pl-4 opacity-75">
              <li>Crie uma automação no Zapier, Make ou n8n com o gatilho “Webhook” e copie o endereço.</li>
              <li>Cole o endereço aqui, escolha os eventos e clique em “Enviar teste”.</li>
              <li>Na automação, adicione a ação “Criar contato/negócio” do seu CRM e ligue os campos (nome, e-mail, telefone, empresa, etapa).</li>
            </ol>
          </details>
          <div className="mt-5 border-t border-night/10 pt-4">
            <Micro>Ou exporte uma planilha no formato do CRM</Micro>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { f: "rd", t: "RD Station" },
                { f: "pipedrive", t: "Pipedrive" },
                { f: "hubspot", t: "HubSpot" },
                { f: "completo", t: "Planilha completa" },
              ].map((x) => (
                <a key={x.f} href={`/api/leads/exportar?formato=${x.f}`} className="flex min-h-9 items-center gap-1.5 rounded-full bg-night px-3.5 text-xs font-medium text-white hover:bg-neon hover:text-night">
                  <Download size={12} aria-hidden /> {x.t}
                </a>
              ))}
            </div>
          </div>
        </Glass>
      </div>

      {/* WhatsApp */}
      <Glass className="p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-[#25d366] text-white">
              <WhatsappIcon size={18} />
            </span>
            <div>
              <Micro>05 · Modelos de WhatsApp</Micro>
              <p className="text-sm opacity-60">Use {"{nome}"}, {"{empresa}"}, {"{meu_nome}"}, {"{minha_empresa}"} e {"{link_portfolio}"}.</p>
            </div>
          </div>
          <button
            type="button"
            disabled={c.whatsapp.modelos.length >= 12}
            onClick={() => setC((s) => ({ ...s, whatsapp: { modelos: [...s.whatsapp.modelos, { id: Math.random().toString(36).slice(2, 8), nome: "Novo modelo", texto: "Oi, {nome}! " }] } }))}
            className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-night/15 px-4 text-xs font-medium hover:bg-white disabled:opacity-40"
          >
            <Plus size={13} aria-hidden /> Novo modelo
          </button>
        </div>
        <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {c.whatsapp.modelos.map((m, i) => (
            <li key={m.id} className="rounded-[20px] border border-white/80 bg-white/60 p-4">
              <div className="flex items-center gap-2">
                <input value={m.nome} onChange={(e) => modelo(i, "nome", e.target.value)} maxLength={40} className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none" aria-label="Nome do modelo" />
                <button
                  type="button"
                  aria-label={`Remover ${m.nome}`}
                  disabled={c.whatsapp.modelos.length <= 1}
                  onClick={() => setC((s) => ({ ...s, whatsapp: { modelos: s.whatsapp.modelos.filter((_, j) => j !== i) } }))}
                  className="flex size-8 cursor-pointer items-center justify-center rounded-full opacity-50 hover:bg-rose-500 hover:text-white hover:opacity-100 disabled:opacity-20"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <textarea value={m.texto} onChange={(e) => modelo(i, "texto", e.target.value)} rows={4} maxLength={1000} className="mt-2 w-full resize-y rounded-xl bg-night/5 p-3 text-xs leading-relaxed outline-none" aria-label="Texto do modelo" />
            </li>
          ))}
        </ul>
      </Glass>
    </div>
  );
}
