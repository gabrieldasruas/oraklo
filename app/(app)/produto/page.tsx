import type { Metadata } from "next";
import { Search, Database, Sparkles, Mail, Target, Plug, type LucideIcon } from "lucide-react";
import { site } from "@/content/site";
import { productSteps } from "@/content/app";
import PageHeader from "@/components/app/PageHeader";
import { Aura, Glass, Micro, Pill, WireArt } from "@/components/app/ui";

export const metadata: Metadata = {
  title: `Produto — ${site.name}`,
  description: "Conheça como a plataforma ajuda a encontrar, qualificar e abordar novos clientes.",
};

const icons: Record<string, LucideIcon> = {
  search: Search,
  database: Database,
  sparkles: Sparkles,
  mail: Mail,
  target: Target,
  plug: Plug,
};
const tones = ["lime", "sun", "mint", "lilac", "coral", "night"] as const;
const arts = ["orbit", "waves", "rings", "fan"] as const;

export default function ProdutoPage() {
  return (
    <>
      <PageHeader
        index="08"
        title="Produto"
        description="Da lista ao primeiro contato, em um só lugar: segmentações por nicho, contatos verificados e sequências de abordagem."
        action={<Pill href="/segmentacao">Explorar segmentações</Pill>}
      />

      <Micro className="mb-3 px-1">Como funciona</Micro>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {productSteps.map((s) => (
          <Glass key={s.n} className="relative p-6">
            <span className="font-mono text-xs text-night/50">{s.n}</span>
            <p className="mt-8 text-6xl font-light leading-none tracking-[-0.06em]">{s.n}</p>
            <h2 className="mt-5 text-xl font-medium tracking-[-0.03em]">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed opacity-60">{s.text}</p>
          </Glass>
        ))}
      </ol>

      <Micro className="mb-3 mt-10 px-1">Recursos</Micro>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {site.features.map((f, i) => {
          const Icon = icons[f.icon];
          const tone = tones[i % tones.length];
          return (
            <Aura key={f.title} tone={tone} className="relative min-h-[230px] p-6">
              <WireArt
                kind={arts[i % arts.length]}
                className={`absolute -bottom-10 -right-10 size-52 opacity-25 ${tone === "night" ? "text-neon" : "text-night"}`}
              />
              <span className={`relative flex size-11 items-center justify-center rounded-full ${tone === "night" ? "bg-neon text-night" : "bg-night text-neon"}`}>
                <Icon size={20} aria-hidden />
              </span>
              <h3 className="relative mt-10 text-2xl font-medium tracking-[-0.03em]">{f.title}</h3>
              <p className="relative mt-2 max-w-xs text-sm leading-relaxed opacity-70">{f.text}</p>
            </Aura>
          );
        })}
      </div>

      <Aura tone="night" className="relative mt-10 p-8 md:p-12">
        <WireArt kind="orbit" spin className="absolute -right-20 -top-24 size-96 text-neon opacity-25" />
        <Micro className="relative !opacity-60">Comece agora</Micro>
        <h2 className="relative mt-3 max-w-xl text-4xl font-medium leading-[1] tracking-[-0.045em] md:text-6xl">
          Pronto para encher o seu funil?
        </h2>
        <div className="relative mt-8 flex flex-wrap gap-3">
          <Pill href="/leads" tone="neon">Cadastrar primeiro lead</Pill>
          <Pill href="/precos" tone="ghost" className="!bg-white/10 !text-white !border-white/20">Ver planos</Pill>
        </div>
      </Aura>
    </>
  );
}
