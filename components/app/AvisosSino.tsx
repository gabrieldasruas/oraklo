"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Eye, FileText, Flame, MailOpen, ShoppingBag } from "lucide-react";
import { carregarAvisos, marcarAvisosLidos } from "@/app/(app)/avisos";
import { agrupar, haQuanto, resumoGrupo, type Aviso, type TipoAviso } from "@/lib/avisos";

const INTERVALO = 60_000; // confere avisos novos a cada minuto (só com a aba visível)
const AGORA_MIN = 10; // "vendo agora" se o último sinal tem menos de 10 min

const ICONE: Record<TipoAviso, typeof Bell> = { cotacao_recebida: ShoppingBag, produto_visto: Eye, email_replied: MailOpen, portfolio_viewed: FileText };

/** Sininho do topo: avisa quando um lead está quente (cotação, catálogo, portfólio, resposta). */
export default function AvisosSino({ className = "", paraCima = false }: { className?: string; /** no menu lateral o sino fica embaixo: o painel abre para cima */ paraCima?: boolean }) {
  const [itens, setItens] = useState<Aviso[]>([]);
  const [naoLidos, setNaoLidos] = useState(0);
  const [lidoAte, setLidoAte] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [tocou, setTocou] = useState(false);
  const anterior = useRef(0);
  const caixa = useRef<HTMLDivElement>(null);

  const atualizar = useCallback(async () => {
    const r = await carregarAvisos().catch(() => null);
    if (!r) return;
    setItens(r.itens);
    setLidoAte(r.lidoAte);
    setNaoLidos(r.naoLidos);
    // chegou aviso novo desde a última conferência: o sino balança
    if (r.naoLidos > anterior.current && anterior.current >= 0) {
      setTocou(true);
      setTimeout(() => setTocou(false), 1200);
    }
    anterior.current = r.naoLidos;
  }, []);

  useEffect(() => {
    anterior.current = -1; // primeira carga não balança
    void atualizar().then(() => {
      if (anterior.current < 0) anterior.current = 0;
    });
    const t = setInterval(() => document.visibilityState === "visible" && void atualizar(), INTERVALO);
    const voltou = () => document.visibilityState === "visible" && void atualizar();
    document.addEventListener("visibilitychange", voltou);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", voltou);
    };
  }, [atualizar]);

  // fecha ao clicar fora ou apertar Esc
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => caixa.current && !caixa.current.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  function abrir() {
    const vai = !aberto;
    setAberto(vai);
    if (vai && naoLidos > 0) {
      // marca como lido, mas mantém o destaque enquanto o painel está aberto
      void marcarAvisosLidos().catch(() => {});
      setNaoLidos(0);
      anterior.current = 0;
    }
  }

  const grupos = useMemo(() => agrupar(itens).slice(0, 12), [itens]);

  return (
    <div ref={caixa} className={`relative ${className}`}>
      <button
        type="button"
        onClick={abrir}
        aria-expanded={aberto}
        aria-label={naoLidos ? `Avisos: ${naoLidos} novo${naoLidos === 1 ? "" : "s"}` : "Avisos"}
        title="Leads quentes"
        className="relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-night/10 bg-white/70 hover:bg-white"
      >
        <Bell size={15} aria-hidden className={tocou ? "sino-toca" : ""} />
        {naoLidos > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-neon px-1 font-mono text-[10px] font-semibold tabular-nums text-night ring-2 ring-canvas">
            {naoLidos > 9 ? "9+" : naoLidos}
          </span>
        )}
      </button>

      {aberto && (
        <div role="dialog" aria-label="Leads quentes" className={`absolute z-50 w-[min(380px,calc(100vw-2rem))] ${paraCima ? "bottom-12 left-0" : "right-0 top-12"} overflow-hidden rounded-[22px] border border-night/10 bg-papel-previa text-night shadow-[0_30px_70px_-25px_color-mix(in_srgb,var(--color-sombra)_55%,transparent)]`}>
          <div className="flex items-center justify-between gap-3 border-b border-night/10 px-4 py-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Flame size={15} aria-hidden className="text-danger-500" /> Leads quentes
            </p>
            <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">últimos 14 dias</span>
          </div>

          {grupos.length ? (
            <ul className="max-h-[60vh] divide-y divide-night/10 overflow-y-auto">
              {grupos.map((g) => {
                const { tipo, titulo, detalhe } = resumoGrupo(g);
                const Icone = ICONE[tipo];
                const novo = !lidoAte || g.ultimo > lidoAte;
                const agora = Date.now() - new Date(g.ultimo).getTime() < AGORA_MIN * 60_000;
                return (
                  <li key={g.chave}>
                    <Link href={`/leads?lead=${g.leadId}`} onClick={() => setAberto(false)} className={`flex gap-3 px-4 py-3 transition-colors hover:bg-night/5 ${novo ? "bg-neon/10" : ""}`}>
                      <span className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-night text-neon">
                        <Icone size={15} aria-hidden />
                        {agora && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2.5 animate-pulse rounded-full bg-neon ring-2 ring-papel-previa" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-snug">
                          <b className="font-medium">{g.nome}</b>
                          {g.empresa ? <span className="opacity-60">, {g.empresa}</span> : null} {titulo}
                        </span>
                        <span className="mt-0.5 block truncate text-xs opacity-55">{detalhe}</span>
                      </span>
                      <span className={`shrink-0 font-mono text-[10px] ${agora ? "font-semibold" : "opacity-50"}`}>{agora ? "agora" : haQuanto(g.ultimo)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-8 text-center">
              <Bell size={22} aria-hidden className="mx-auto opacity-30" />
              <p className="mt-3 text-sm font-medium">Nenhum aviso ainda</p>
              <p className="mx-auto mt-1 max-w-[260px] text-xs leading-relaxed opacity-60">
                Quando um lead abrir seu portfólio ou catálogo pelo link que você enviou pelo Oraklo, ou pedir cotação, aparece aqui.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-night/10 px-4 py-2.5 text-xs">
            <Link href="/portfolio?aba=catalogo" onClick={() => setAberto(false)} className="opacity-65 hover:opacity-100">
              Meu catálogo
            </Link>
            <Link href="/leads" onClick={() => setAberto(false)} className="font-medium underline-offset-4 hover:underline">
              Ver todos os leads
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
