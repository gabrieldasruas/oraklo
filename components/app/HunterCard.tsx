"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, Unplug, UserRoundSearch } from "lucide-react";
import { Glass, Micro } from "@/components/app/ui";
import { conectarHunter, contaHunter, desconectarHunter, type ContaHunter } from "@/app/(app)/leads/enriquecer";

// Conta do Hunter do próprio cliente: a busca do e-mail dos decisores usa os créditos dela.
export default function HunterCard() {
  const [conta, setConta] = useState<ContaHunter | null>(null);
  const [chave, setChave] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    contaHunter()
      .then(setConta)
      .catch(() => setConta({ conectado: false, final: null, creditos: null, liberado: false }));
  }, []);

  async function conectar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro(null);
    const r = await conectarHunter(chave).catch(() => ({ ok: false as const, erro: "Não foi possível conectar." }));
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    setChave("");
    setConta(r.conta);
  }

  async function desconectar() {
    setOcupado(true);
    await desconectarHunter().catch(() => {});
    setOcupado(false);
    setConta((c) => (c ? { ...c, conectado: false, final: null, creditos: null } : c));
  }

  return (
    <Glass className="p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-night text-neon">
            <UserRoundSearch size={18} aria-hidden />
          </span>
          <div>
            <Micro>Hunter · e-mail dos decisores</Micro>
            <p className="text-sm opacity-60">Com a sua conta do Hunter, o Oraklo acha o e-mail dos sócios. As buscas usam os créditos da sua conta.</p>
          </div>
        </div>
        {conta?.conectado && (
          <span className="flex items-center gap-1.5 rounded-full bg-neon/50 px-3 py-1 text-xs font-medium">
            <Check size={12} aria-hidden /> Conectado
          </span>
        )}
      </div>

      {!conta ? (
        <p className="mt-5 flex items-center gap-2 text-sm opacity-60">
          <Loader2 size={13} className="animate-spin" /> Carregando…
        </p>
      ) : !conta.liberado ? (
        <p className="mt-5 text-sm opacity-70">
          Faz parte do pacote Premium.{" "}
          <a href="/pacotes" className="underline underline-offset-4">
            Ver pacotes
          </a>
        </p>
      ) : conta.conectado ? (
        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
          <span className="font-mono text-xs opacity-70">Chave terminada em {conta.final}</span>
          {conta.creditos && (
            <span className="opacity-70">
              {conta.creditos.usados} de {conta.creditos.total} buscas usadas este mês
            </span>
          )}
          <button type="button" onClick={() => void desconectar()} disabled={ocupado} className="ml-auto flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-night/15 px-4 text-xs hover:bg-night/5 disabled:opacity-50">
            <Unplug size={12} aria-hidden /> Desconectar
          </button>
        </div>
      ) : (
        <form onSubmit={conectar} className="mt-5 space-y-3">
          <label className="block text-sm">
            Chave da API do Hunter
            <input
              value={chave}
              onChange={(e) => setChave(e.target.value)}
              placeholder="Cole aqui a sua API key"
              autoComplete="off"
              className="mt-2 min-h-12 w-full rounded-2xl border border-night/10 bg-white/70 px-4 font-mono text-sm outline-none focus:border-night/30"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={ocupado || !chave.trim()} className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-night px-5 text-xs font-medium text-white disabled:opacity-50">
              {ocupado && <Loader2 size={12} className="animate-spin" />} Conectar
            </button>
            <a href="https://hunter.io/api-keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs underline-offset-4 hover:underline">
              Criar conta e pegar a chave no Hunter (tem plano grátis) <ExternalLink size={11} aria-hidden />
            </a>
          </div>
        </form>
      )}
      {erro && <p className="mt-3 text-sm text-danger-700">{erro}</p>}
    </Glass>
  );
}
