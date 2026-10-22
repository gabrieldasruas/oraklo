import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import { Aura, Micro, Pill, WireArt } from "@/components/app/ui";

export const metadata: Metadata = {
  title: `Guias — ${site.name}`,
  description: "Passo a passo para encontrar, priorizar e abordar empresas com o Oraklo.",
};

const tones = ["lime", "sun", "night", "mint", "lilac", "coral"] as const;
const arts = ["orbit", "waves", "rings", "fan"] as const;

export default function GuiasPage() {
  return (
    <>
      <PageHeader
        index="09"
        title="Guias"
        description="Passo a passo para tirar o máximo do Oraklo: do perfil de cliente ideal à reunião marcada."
        action={<Pill href="/entrar">Começar grátis</Pill>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {site.guias.map((g, i) => {
          const tone = tones[i % tones.length];
          const dark = tone === "night";
          return (
            <article key={g.title}>
              <Link href={g.href} className="block">
                <Aura tone={tone} className="group relative flex min-h-[320px] flex-col p-6 transition-transform hover:-translate-y-1">
                  <WireArt kind={arts[i % arts.length]} className={`absolute -bottom-12 -right-12 size-60 opacity-25 ${dark ? "text-neon" : "text-night"}`} />
                  <div className="relative flex items-start justify-between">
                    <Micro className="!opacity-70">{g.category}</Micro>
                    <ArrowUpRight size={18} aria-hidden className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </div>
                  <p className="relative mt-8 text-7xl font-light leading-none tracking-[-0.06em]">
                    {g.passos}
                    <span className="ml-2 text-base tracking-normal opacity-60">passos</span>
                  </p>
                  <h2 className="relative mt-auto max-w-[22rem] pt-8 text-xl font-medium leading-tight tracking-[-0.025em]">{g.title}</h2>
                  <p className={`relative mt-2 text-sm leading-relaxed ${dark ? "text-white/65" : "opacity-65"}`}>{g.text}</p>
                  <p className="relative mt-4 font-mono text-[10px] uppercase tracking-widest opacity-60">{g.read} de leitura</p>
                </Aura>
              </Link>
            </article>
          );
        })}
      </div>
    </>
  );
}
