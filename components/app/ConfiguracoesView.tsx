"use client";

import { useState } from "react";
import { Check, Loader2, Plug, UserPlus, X } from "lucide-react";
import { Glass, Micro } from "@/components/app/ui";
import type { ConfigWorkspace } from "@/lib/config-workspace";
import { useConfigAutosave } from "@/lib/useConfigAutosave";
import { renomearWorkspace, salvarNome } from "@/app/(app)/configuracoes/actions";
import type { Limites } from "@/lib/pacotes";

type Props = {
  inicial: ConfigWorkspace;
  usuario: { nome: string; email: string; workspace: string };
  plano: { id: "gratis" | "premium" | "ultra"; nome: string; limites: Limites; uso: { pipeline: number; emails: number; ia: number; buscas: number } };
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
  const { c, setC, estado, erro } = useConfigAutosave(inicial);
  // campos começam em branco: só o que a pessoa digitar é salvo
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [perfilMsg, setPerfilMsg] = useState<string | null>(null);

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setPerfilMsg(null);
    try {
      if (nome.trim()) await salvarNome(nome);
      if (empresa.trim()) await renomearWorkspace(empresa);
      setNome("");
      setEmpresa("");
      setPerfilMsg("Salvo");
    } catch (err) {
      setPerfilMsg(err instanceof Error ? err.message : "Não foi possível salvar");
    }
  }


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
              <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} placeholder="Como você quer ser chamado" />
            </label>
            <label className="block text-sm font-medium">
              E-mail
              <input className={`${campo} opacity-60`} value={usuario.email} readOnly />
            </label>
            <label className="block text-sm font-medium">
              Empresa (nome do workspace)
              <input className={campo} value={empresa} onChange={(e) => setEmpresa(e.target.value)} maxLength={80} placeholder="Nome da sua empresa" />
            </label>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={!nome.trim() && !empresa.trim()} className="min-h-11 cursor-pointer rounded-full bg-night px-5 text-sm font-medium text-white disabled:opacity-40">
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
              <a href="/pacotes" className="min-h-10 rounded-full bg-neon px-4 py-2.5 text-xs font-medium text-night">
                Ver pacotes
              </a>
            )}
          </div>
          <div className="mt-6 space-y-5">
            <BarraUso rotulo="Buscas na Busca avançada" usado={plano.uso.buscas} limite={plano.limites.buscasMes} />
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
            placeholder={"Seu nome\nSua empresa · (00) 00000-0000\nseusite.com.br"}
            className="mt-4 w-full resize-y rounded-2xl border border-night/10 bg-white/70 p-4 text-sm leading-relaxed outline-none focus:border-night/30"
          />
          <div className="mt-4 border-t border-night/10 pt-2">
            <Micro>Notificações</Micro>
            <Interruptor rotulo="Radar: avisar sobre empresas novas no meu perfil" on={c.notificar.radar} onChange={(v) => setC((s) => ({ ...s, notificar: { ...s.notificar, radar: v } }))} />
            <Interruptor rotulo="Resumo semanal por e-mail" on={c.notificar.resumoSemanal} onChange={(v) => setC((s) => ({ ...s, notificar: { ...s.notificar, resumoSemanal: v } }))} />
          </div>
        </Glass>

        {/* atalho para integrações */}
        <a href="/integracoes" className="group relative flex flex-col justify-between overflow-hidden rounded-[28px] bg-night p-7 text-white transition-transform hover:-translate-y-0.5">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, rgba(184,255,60,0.6), transparent 70%)" }} />
          <div className="relative">
            <Micro className="!text-neon !opacity-90">04 · Integrações</Micro>
            <p className="mt-3 text-3xl font-light tracking-[-0.04em]">Integrar CRM e WhatsApp</p>
            <p className="mt-2 max-w-sm text-sm text-white/60">RD Station, Zapier, Make, n8n, planilhas por CRM e modelos de WhatsApp agora ficam numa aba própria.</p>
          </div>
          <span className="relative mt-6 flex w-fit items-center gap-2 rounded-full bg-neon px-5 py-2.5 text-sm font-medium text-night">
            <Plug size={15} aria-hidden /> Abrir Integrar CRM
          </span>
        </a>
      </div>
    </div>
  );
}
