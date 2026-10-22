"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, Unplug, Upload } from "lucide-react";
import { Glass, Micro } from "@/components/app/ui";
import { STATUSES } from "@/lib/lead-types";
import type { ConfigWorkspace } from "@/lib/config-workspace";
import type { FunilRd } from "@/lib/rdstation";
import { conectarRd, desconectarRd, enviarLeadsRd, funisRd } from "@/app/(app)/configuracoes/rd";

type Props = {
  c: ConfigWorkspace;
  setC: (f: (c: ConfigWorkspace) => ConfigWorkspace) => void;
  /** configuração que veio do servidor (conectar/desconectar): atualiza a tela sem disparar outro salvamento */
  onServidor: (c: ConfigWorkspace) => void;
};

function Opcao({ on, onChange, rotulo }: { on: boolean; onChange: (v: boolean) => void; rotulo: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-2 text-sm">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-[#0b0b0c]" />
      {rotulo}
    </label>
  );
}

export default function RdStationCard({ c, setC, onServidor }: Props) {
  const rd = c.rd;
  const [token, setToken] = useState("");
  const [funis, setFunis] = useState<FunilRd[] | null>(null);
  const [ocupado, setOcupado] = useState<null | "conectar" | "enviar" | "sair">(null);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const funil = funis?.find((f) => f.id === rd.funilId) ?? funis?.[0];

  useEffect(() => {
    if (!rd.conectado || funis) return;
    funisRd()
      .then((r) => (r.ok ? setFunis(r.funis) : setErro(r.erro)))
      .catch(() => setErro("Não foi possível carregar os funis do RD Station."));
  }, [rd.conectado, funis]);

  async function conectar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado("conectar");
    setErro(null);
    const r = await conectarRd(token).catch(() => ({ ok: false as const, erro: "Não foi possível conectar." }));
    setOcupado(null);
    if (!r.ok) return setErro(r.erro);
    setToken("");
    setFunis(r.funis);
    onServidor(r.config);
  }

  async function enviarExistentes() {
    setOcupado("enviar");
    setErro(null);
    setResultado(null);
    const r = await enviarLeadsRd().catch(() => ({ ok: false as const, erro: "Não foi possível enviar." }));
    setOcupado(null);
    if (!r.ok) return setErro(r.erro);
    const partes = [`${r.enviados} enviado${r.enviados === 1 ? "" : "s"}`];
    if (r.jaEstavam) partes.push(`${r.jaEstavam} já estavam lá`);
    if (r.falharam) partes.push(`${r.falharam} com erro`);
    if (r.restam) partes.push(`faltam ${r.restam} (clique de novo em 1 minuto)`);
    setResultado(partes.join(" · ") + (r.aviso ? ` — ${r.aviso}` : ""));
  }

  return (
    <Glass className="p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-[#1b2b5b] font-semibold text-white">RD</span>
          <div>
            <Micro>06 · RD Station CRM</Micro>
            <p className="text-sm opacity-60">Integração direta: cada lead vira empresa, contato e negociação no seu RD.</p>
          </div>
        </div>
        {rd.conectado && (
          <span className="flex items-center gap-1.5 rounded-full bg-neon/50 px-3 py-1 text-xs font-medium">
            <Check size={12} aria-hidden /> Conectado
          </span>
        )}
      </div>

      {!rd.conectado ? (
        <form onSubmit={conectar} className="mt-5 space-y-3">
          <label className="block text-sm font-medium">
            Token da API do RD Station CRM
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole o token aqui"
              className="mt-2 min-h-12 w-full rounded-2xl border border-night/10 bg-white/70 px-4 font-mono text-sm outline-none focus:border-night/30"
            />
          </label>
          <p className="text-xs opacity-60">
            No RD Station CRM, clique no seu nome → <b>Perfil</b> → copie o <b>Token</b>. Ele fica guardado cifrado e não aparece mais na tela.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={!token.trim() || ocupado === "conectar"} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-night px-5 text-sm font-medium text-white disabled:opacity-40">
              {ocupado === "conectar" && <Loader2 size={14} className="animate-spin" />} Conectar
            </button>
            <a href="https://developers.rdstation.com/reference/crm-v1-token" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs underline-offset-4 hover:underline">
              Como pegar o token <ExternalLink size={11} aria-hidden />
            </a>
          </div>
        </form>
      ) : (
        <div className="mt-5 space-y-5">
          {rd.conta && (
            <p className="text-sm">
              <span className="opacity-60">Conta:</span> <b>{rd.conta.nome}</b> {rd.conta.organizacao && <span className="opacity-60">· {rd.conta.organizacao}</span>}
            </p>
          )}

          <label className="block text-sm font-medium">
            Funil de vendas no RD
            <select
              value={funil?.id ?? ""}
              onChange={(e) => setC((s) => ({ ...s, rd: { ...s.rd, funilId: e.target.value, etapas: {} } }))}
              disabled={!funis}
              className="mt-2 min-h-11 w-full cursor-pointer rounded-2xl border border-night/10 bg-white/70 px-3 text-sm"
            >
              {!funis && <option>Carregando…</option>}
              {funis?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest opacity-50">Etapa do Oraklo → etapa no RD</p>
            <ul className="space-y-2">
              {STATUSES.map((st) => (
                <li key={st} className="grid grid-cols-[9rem_1fr] items-center gap-3 text-sm">
                  <span>{st}</span>
                  <select
                    value={rd.etapas[st] ?? ""}
                    onChange={(e) => setC((s) => ({ ...s, rd: { ...s.rd, funilId: funil?.id ?? s.rd.funilId, etapas: { ...s.rd.etapas, [st]: e.target.value } } }))}
                    className="min-h-10 cursor-pointer rounded-xl border border-night/10 bg-white/70 px-2 text-sm"
                  >
                    <option value="">Não mover</option>
                    {funil?.etapas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nome}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-night/10 pt-3">
            <Opcao on={rd.enviarNovos} onChange={(v) => setC((s) => ({ ...s, rd: { ...s.rd, enviarNovos: v } }))} rotulo="Enviar cada lead novo automaticamente" />
            <Opcao on={rd.sincronizarEtapas} onChange={(v) => setC((s) => ({ ...s, rd: { ...s.rd, sincronizarEtapas: v } }))} rotulo="Mover a negociação quando o lead mudar de etapa" />
            <Opcao on={rd.anotacoes} onChange={(v) => setC((s) => ({ ...s, rd: { ...s.rd, anotacoes: v } }))} rotulo="Levar notas e reuniões como anotações" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void enviarExistentes()} disabled={!!ocupado} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-night px-4 text-xs font-medium text-white disabled:opacity-40">
              {ocupado === "enviar" ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} aria-hidden />} Enviar leads que ainda não estão no RD
            </button>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm("Desconectar o RD Station? Os leads já enviados continuam lá.")) return;
                setOcupado("sair");
                onServidor(await desconectarRd());
                setFunis(null);
                setOcupado(null);
              }}
              disabled={!!ocupado}
              className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-night/15 px-4 text-xs hover:border-rose-500 hover:text-rose-600 disabled:opacity-40"
            >
              <Unplug size={13} aria-hidden /> Desconectar
            </button>
          </div>
          {resultado && <p className="text-xs text-emerald-700">{resultado}</p>}
        </div>
      )}
      {erro && <p className="mt-3 text-xs text-rose-700">{erro}</p>}
    </Glass>
  );
}
