"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, X } from "lucide-react";
import { WhatsappIcon } from "@/components/brand/Icons";
import type { Lead } from "@/lib/lead-types";
import { completar, preencherEmail, type Portfolio } from "@/lib/portfolio-types";
import { CONFIG_PADRAO, type ModeloWhatsapp } from "@/lib/config-workspace";
import { carregarConfig } from "@/app/(app)/configuracoes/actions";
import { carregarPortfolio, estatisticasPortfolio } from "@/app/(app)/portfolio/actions";
import { escreverComIA, iaDisponivel, registrarWhatsapp } from "@/app/(app)/leads/abordagem";

const numeroZap = (p: string) => {
  const d = p.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return d.length === 10 || d.length === 11 ? d : null;
};

/** Mensagem de WhatsApp a partir de um modelo (ou escrita com IA), registrada no histórico do lead. */
export default function WhatsappModal({ lead, onFechar, onMoveu }: { lead: Lead; onFechar: () => void; onMoveu: (id: string) => void }) {
  const [modelos, setModelos] = useState<ModeloWhatsapp[]>(CONFIG_PADRAO.whatsapp.modelos);
  const [port, setPort] = useState<Portfolio>(completar(null));
  const [link, setLink] = useState("");
  const [modeloId, setModeloId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [ia, setIa] = useState<boolean | null>(null);
  const [escrevendo, setEscrevendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const zap = numeroZap(lead.phone);

  const preencher = useMemo(
    () => (t: string) => preencherEmail(t.replaceAll("{link_portfolio}", link), port, lead),
    [link, port, lead],
  );

  useEffect(() => {
    Promise.all([carregarConfig().catch(() => null), carregarPortfolio().catch(() => null), estatisticasPortfolio().catch(() => null), iaDisponivel().catch(() => false)]).then(([cfg, p, st, temIa]) => {
      const ms = cfg?.whatsapp.modelos ?? CONFIG_PADRAO.whatsapp.modelos;
      setModelos(ms);
      if (p) setPort(p);
      const l = st?.id && p?.compartilhar?.ativo ? `${window.location.origin}/p/${st.id}?l=${lead.id}` : "";
      setLink(l);
      setIa(temIa);
      const primeiro = ms[0];
      if (primeiro) {
        setModeloId(primeiro.id);
        setTexto(preencherEmail(primeiro.texto.replaceAll("{link_portfolio}", l), p ?? completar(null), lead));
      }
    });
  }, [lead]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onFechar]);

  async function comIA() {
    setEscrevendo(true);
    setErro(null);
    const r = await escreverComIA({ leadId: lead.id, canal: "whatsapp", modelo: false }).catch(() => ({ ok: false as const, erro: "Não foi possível falar com a IA." }));
    setEscrevendo(false);
    if (!r.ok) return setErro(r.erro);
    setModeloId(null);
    setTexto(preencher(r.texto));
  }

  function abrir() {
    if (!zap || !texto.trim()) return;
    window.open(`https://wa.me/55${zap}?text=${encodeURIComponent(texto.trim())}`, "_blank", "noopener,noreferrer");
    void registrarWhatsapp(lead.id, texto.trim(), modeloId)
      .then((r) => r.moveu && onMoveu(lead.id))
      .catch(() => {});
    onFechar();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-night/40 backdrop-blur-[2px] sm:items-center sm:p-6" onClick={onFechar}>
      <div role="dialog" aria-label={`WhatsApp para ${lead.name}`} onClick={(e) => e.stopPropagation()} className="previa-in w-full max-w-lg overflow-hidden rounded-t-[28px] bg-[#f4f4f1] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.7)] sm:rounded-[28px]">
        <header className="flex items-center gap-3 border-b border-night/10 bg-white/70 px-6 py-4">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-[#25d366] text-white">
            <WhatsappIcon size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-medium leading-tight tracking-[-0.02em]">WhatsApp</p>
            <p className="truncate text-xs opacity-55">
              {lead.name} · {lead.company}
            </p>
          </div>
          <button type="button" aria-label="Fechar" onClick={onFechar} className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-night/5">
            <X size={17} />
          </button>
        </header>

        <div className="space-y-4 p-6">
          {!zap && <p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">Esse lead não tem celular cadastrado. Edite o telefone no painel do lead.</p>}
          <div className="flex flex-wrap gap-1.5">
            {modelos.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setModeloId(m.id);
                  setTexto(preencher(m.texto));
                }}
                className={`min-h-8 cursor-pointer rounded-full px-3 text-xs ${modeloId === m.id ? "bg-night text-white" : "border border-night/10 bg-white hover:bg-night/5"}`}
              >
                {m.nome}
              </button>
            ))}
            {ia !== false && (
              <button type="button" onClick={() => void comIA()} disabled={escrevendo || ia === null} className="flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full bg-neon px-3 text-xs font-medium text-night disabled:opacity-50">
                {escrevendo ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} aria-hidden />} Escrever com IA
              </button>
            )}
          </div>
          {erro && <p className="text-xs text-rose-700">{erro}</p>}
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={6} className="w-full resize-y rounded-2xl border border-white bg-white p-4 text-sm leading-relaxed outline-none focus:border-night/30" />
          <p className="text-[11px] opacity-50">
            Edite à vontade antes de abrir. Modelos ficam em{" "}
            <Link href="/configuracoes" className="underline underline-offset-2">
              Configurações
            </Link>
            .
          </p>
        </div>

        <footer className="flex justify-end border-t border-night/10 bg-white/70 px-6 py-4">
          <button type="button" onClick={abrir} disabled={!zap || !texto.trim()} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-[#25d366] px-6 text-sm font-medium text-white disabled:opacity-40">
            <WhatsappIcon size={16} /> Abrir no WhatsApp
          </button>
        </footer>
      </div>
    </div>
  );
}
