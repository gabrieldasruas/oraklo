import Link from "next/link";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import type { PerfilBusca } from "@/lib/perfil-busca";
import { forcaDoPerfil } from "@/lib/perfil-busca";
import PastaOraklo from "./PastaOraklo";

/** Card escuro embaixo do anel: chamada para montar o perfil de cliente ideal. */
export default function VitrinePerfil({ perfil, nomesNichos }: { perfil: PerfilBusca; nomesNichos: string[] }) {
  const forca = forcaDoPerfil(perfil);
  return (
    <section aria-label="Perfil de cliente ideal" className="relative overflow-hidden rounded-[28px] bg-verde-noite p-6 text-white md:p-8">
      <span aria-hidden className="pointer-events-none absolute -left-24 -top-10 size-96 rounded-full opacity-35 blur-3xl" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-neon) 55%, transparent), transparent 70%)" }} />
      <div className="relative grid items-center gap-8 md:grid-cols-[1fr_1.05fr]">
        <div className="order-2 md:order-1">
          <PastaOraklo etiqueta={`${forca.feitos}/${forca.total}`} />
        </div>

        <div className="order-1 md:order-2">
          <div className="flex items-center gap-3">
            <span className="block size-1.5 bg-white" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">Portfólio · Busca avançada</span>
          </div>
          <h2 className="mt-5 text-4xl font-light leading-[1.02] tracking-[-0.045em] md:text-5xl">
            Ofereça seus produtos da forma <span className="font-serif italic text-neon">mais profissional</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
            Deixe a busca avançada cada vez melhor: escolha os nichos que você quer focar, diga como é o seu cliente ideal e marque 👍 / 👎 nas empresas. Cada escolha deixa os próximos resultados mais certeiros.
          </p>

          {nomesNichos.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {nomesNichos.slice(0, 4).map((n) => (
                <span key={n} className="rounded-full border border-neon/40 px-3 py-1 text-[11px] text-neon">
                  {n}
                </span>
              ))}
              {nomesNichos.length > 4 && <span className="rounded-full border border-white/15 px-3 py-1 text-[11px] text-white/60">+{nomesNichos.length - 4}</span>}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <a href="#foco" className="group flex min-h-12 items-center gap-3 rounded-full bg-neon py-1.5 pl-6 pr-1.5 text-sm font-medium text-night transition-transform hover:-translate-y-0.5">
              {nomesNichos.length ? "Aprimorar meu perfil" : "Escolher meus nichos"}
              <span className="flex size-9 items-center justify-center rounded-full bg-night text-neon">
                <ArrowDown size={16} aria-hidden />
              </span>
            </a>
            <Link href="/busca-avancada" className="flex min-h-12 items-center gap-2 rounded-full border border-white/15 px-5 text-sm text-white/80 hover:bg-white/10">
              <Sparkles size={14} aria-hidden className="text-neon" /> Buscar com meu perfil <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
