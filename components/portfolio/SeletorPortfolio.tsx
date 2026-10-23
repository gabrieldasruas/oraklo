"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, LayoutTemplate, ShoppingBag, Sparkles, X } from "lucide-react";

const DICA_CHAVE = "oraklo-dica-catalogo";
/** O editor da Apresentação manda este evento quando soluções, cases ou o link mudam. */
export const EVENTO_RESUMO = "oraklo:resumo-portfolio";
const fmt = (n: number) => n.toLocaleString("pt-BR");

type Resumo = {
  produtos: number;
  compradores: number;
  solucoes: number;
  cases: number;
  linkAtivo: boolean;
};

/**
 * As duas partes do Portfólio como cartões de escolha. Na primeira visita, uma dica aponta
 * para o Catálogo ("Quem compra o que eu vendo"); fechou, não aparece mais.
 */
export default function SeletorPortfolio({ aba, resumo: inicial }: { aba: "apresentacao" | "catalogo"; resumo: Resumo }) {
  const [dica, setDica] = useState(false);
  const [resumo, setResumo] = useState(inicial);

  useEffect(() => setResumo(inicial), [inicial]);
  useEffect(() => {
    const ouvir = (e: Event) => {
      const d = (e as CustomEvent<Partial<Resumo>>).detail;
      if (d) setResumo((r) => ({ ...r, ...d }));
    };
    window.addEventListener(EVENTO_RESUMO, ouvir);
    return () => window.removeEventListener(EVENTO_RESUMO, ouvir);
  }, []);

  useEffect(() => {
    if (aba === "catalogo") return;
    try {
      if (!localStorage.getItem(DICA_CHAVE)) setDica(true);
    } catch {}
  }, [aba]);

  const fecharDica = () => {
    setDica(false);
    try {
      localStorage.setItem(DICA_CHAVE, "1");
    } catch {}
  };

  const cartoes = [
    {
      id: "apresentacao" as const,
      href: "/portfolio",
      Icone: LayoutTemplate,
      titulo: "Apresentação",
      texto: "Quem você é, soluções e cases. Vira slides em PDF, e-mail de apresentação e link com visitas.",
      dados: [`${resumo.solucoes} soluç${resumo.solucoes === 1 ? "ão" : "ões"}`, `${resumo.cases} case${resumo.cases === 1 ? "" : "s"}`, resumo.linkAtivo ? "link ativo" : "link desligado"],
    },
    {
      id: "catalogo" as const,
      href: "/portfolio?aba=catalogo",
      Icone: ShoppingBag,
      titulo: "Catálogo",
      texto: "Seus produtos com preço. O Oraklo mostra quem compra cada um, abre no mapa e monta a oferta.",
      dados: resumo.produtos
        ? [`${resumo.produtos} produto${resumo.produtos === 1 ? "" : "s"}`, `${fmt(resumo.compradores)} compradores em potencial`]
        : ["Comece com um produto de exemplo"],
    },
  ];

  return (
    <div className="relative mb-4">
      <nav aria-label="Partes do portfólio" className="grid gap-3 md:grid-cols-2">
        {cartoes.map((c) => {
          const on = aba === c.id;
          const catalogo = c.id === "catalogo";
          return (
            <Link
              key={c.id}
              href={c.href}
              aria-current={on ? "page" : undefined}
              onClick={catalogo ? fecharDica : undefined}
              className={`group relative flex items-start gap-4 overflow-hidden rounded-[24px] border p-5 transition-all hover:-translate-y-0.5 ${
                on ? "border-night bg-night text-white" : "border-white/70 bg-white/55 hover:bg-white/90"
              } ${catalogo && !on && dica ? "ring-2 ring-neon ring-offset-2 ring-offset-canvas" : ""}`}
            >
              {catalogo && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-14 -top-14 size-44 rounded-full opacity-40 blur-3xl transition-opacity group-hover:opacity-70"
                  style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-neon) 70%, transparent), transparent 70%)" }}
                />
              )}
              <span className={`relative flex size-12 shrink-0 items-center justify-center rounded-2xl ${on ? "bg-neon text-night" : catalogo ? "bg-night text-neon" : "bg-night/5"}`}>
                <c.Icone size={20} aria-hidden />
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-xl font-medium tracking-[-0.03em]">{c.titulo}</span>
                  {catalogo && (
                    <span className="rounded-full bg-neon px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-night">Novo</span>
                  )}
                  {catalogo && <span className={`text-xs ${on ? "text-white/55" : "opacity-55"}`}>Quem compra o que eu vendo</span>}
                </span>
                <span className={`mt-1 block text-sm leading-snug ${on ? "text-white/65" : "opacity-65"}`}>{c.texto}</span>
                <span className="mt-3 flex flex-wrap gap-1.5">
                  {c.dados.map((d) => (
                    <span key={d} className={`rounded-full px-2.5 py-1 font-mono text-[10px] tabular-nums ${on ? "bg-white/10 text-white/80" : "bg-night/5"}`}>
                      {d}
                    </span>
                  ))}
                </span>
              </span>
              <ArrowRight size={18} aria-hidden className={`relative mt-1 shrink-0 transition-transform group-hover:translate-x-1 ${on ? "opacity-0" : "opacity-50"}`} />
            </Link>
          );
        })}
      </nav>

      {/* dica da primeira visita, apontando para o Catálogo */}
      {dica && (
        <div role="status" className="dica-in relative z-10 mt-3 md:ml-[calc(50%+0.375rem)]">
          <span aria-hidden className="absolute -top-1.5 left-10 size-3 rotate-45 bg-night" />
          <div className="relative rounded-[22px] bg-night p-5 text-white shadow-[0_24px_50px_-24px_color-mix(in_srgb,var(--color-sombra)_70%,transparent)]">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neon text-night">
                <Sparkles size={16} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Novidade: veja quem compra o que você vende</p>
                <ol className="mt-2 grid gap-1 text-xs text-white/70 sm:grid-cols-3">
                  <li><span className="font-mono text-neon">01</span> Cadastre um produto</li>
                  <li><span className="font-mono text-neon">02</span> Veja os compradores no mapa</li>
                  <li><span className="font-mono text-neon">03</span> Mande a oferta pronta</li>
                </ol>
              </div>
              <button type="button" onClick={fecharDica} aria-label="Fechar dica" className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/10">
                <X size={14} aria-hidden />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/portfolio?aba=catalogo" onClick={fecharDica} className="flex min-h-10 items-center gap-2 rounded-full bg-neon px-4 text-sm font-medium text-night hover:bg-neon-claro">
                Abrir catálogo <ArrowRight size={14} aria-hidden />
              </Link>
              <button type="button" onClick={fecharDica} className="min-h-10 cursor-pointer rounded-full px-4 text-sm text-white/70 hover:text-white">
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
