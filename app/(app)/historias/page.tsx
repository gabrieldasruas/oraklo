import type { Metadata } from "next";
import { Quote } from "lucide-react";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import { Aura, Glass, Micro, WireArt } from "@/components/app/ui";

export const metadata: Metadata = {
  title: `Histórias de clientes — ${site.name}`,
  description: "Resultados reais de times comerciais que prospectam com a plataforma.",
};

const tones = ["lime", "sun", "night", "mint", "lilac", "coral"] as const;
const arts = ["orbit", "waves", "rings", "fan"] as const;

export default function HistoriasPage() {
  return (
    <>
      <PageHeader
        index="09"
        title="Histórias"
        description="Resultados reais de vendas B2B: como times comerciais estão encontrando, qualificando e convertendo novos clientes."
      />

      {/* Filtros apenas visuais nesta fase */}
      <ul aria-label="Categorias" className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {site.categories.map((c, i) => (
          <li key={c} className="shrink-0">
            <span
              className={`inline-flex min-h-11 items-center rounded-full border px-5 text-sm ${
                i === 0 ? "border-night bg-night font-medium text-white" : "border-white/70 bg-white/55"
              }`}
            >
              {c}
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {site.stories.map((s, i) => {
          const tone = tones[i % tones.length];
          const dark = tone === "night";
          return (
            <article key={s.title}>
              <Aura tone={tone} className="group relative flex min-h-[320px] flex-col p-6 transition-transform hover:-translate-y-1">
                <WireArt
                  kind={arts[i % arts.length]}
                  className={`absolute -bottom-12 -right-12 size-60 opacity-25 ${dark ? "text-neon" : "text-night"}`}
                />
                <div className="relative flex items-start justify-between">
                  <Micro className="!opacity-70">{s.category}</Micro>
                  <Micro className="!opacity-70">{s.company}</Micro>
                </div>
                <p className="relative mt-8 text-7xl font-light leading-none tracking-[-0.06em]">{s.metric}</p>
                <h2 className="relative mt-auto max-w-[22rem] pt-8 text-xl font-medium leading-tight tracking-[-0.025em]">
                  {s.title}
                </h2>
                <p className="relative mt-4 font-mono text-[10px] uppercase tracking-widest opacity-60">
                  {s.read} de leitura
                </p>
              </Aura>
            </article>
          );
        })}
      </div>

      <Micro className="mb-3 mt-12 px-1">{site.wall.title}</Micro>
      <div className="grid gap-4 md:grid-cols-3">
        {site.wall.quotes.map((q) => (
          <Glass key={q.name} className="flex flex-col p-6">
            <Quote size={20} aria-hidden />
            <blockquote className="mt-6 flex-1 text-lg leading-snug tracking-[-0.02em]">{q.text}</blockquote>
            <figcaption className="mt-8 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-night font-mono text-xs text-neon">
                {q.name.split(" ").map((n) => n[0]).join("")}
              </span>
              <span>
                <span className="block text-sm font-medium">{q.name}</span>
                <span className="block text-xs opacity-55">{q.role}</span>
              </span>
            </figcaption>
          </Glass>
        ))}
      </div>
    </>
  );
}
