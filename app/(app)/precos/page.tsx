import type { Metadata } from "next";
import { Check } from "lucide-react";
import { site } from "@/content/site";
import { plans, faq } from "@/content/app";
import PageHeader from "@/components/app/PageHeader";
import { Aura, Glass, Micro, Pill, WireArt } from "@/components/app/ui";

export const metadata: Metadata = {
  title: `Preços — ${site.name}`,
  description: "Planos para prospectar do primeiro contato à operação em escala.",
};

export default function PrecosPage() {
  return (
    <>
      <PageHeader
        index="10"
        title="Preços"
        description="Comece grátis, sem cartão. Suba de plano quando precisar de mais."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((p) => {
          const Wrapper = p.highlight ? Aura : Glass;
          const wrapperProps = p.highlight ? { tone: "night" as const } : {};
          return (
            <Wrapper key={p.name} {...(wrapperProps as { tone: "night" })} className="relative flex flex-col p-7">
              {p.highlight && (
                <WireArt kind="orbit" spin className="absolute -right-16 -top-16 size-72 text-neon opacity-25" />
              )}
              <div className="relative flex items-center justify-between">
                <Micro className={p.highlight ? "!opacity-60" : ""}>{p.name}</Micro>
                {p.highlight && (
                  <span className="rounded-full bg-neon px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-night">
                    Mais popular
                  </span>
                )}
              </div>
              <p className="relative mt-8 text-6xl font-light leading-none tracking-[-0.06em]">
                {p.price}
                {p.price.startsWith("R$") && <span className="text-base tracking-normal opacity-50"> /mês</span>}
              </p>
              <p className="relative mt-3 text-sm opacity-60">{p.desc}</p>
              <ul className="relative mt-8 flex-1 space-y-3 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-3 border-b border-current/10 pb-3">
                    <span className={`flex size-5 items-center justify-center rounded-full ${p.highlight ? "bg-neon text-night" : "bg-night text-neon"}`}>
                      <Check size={12} aria-hidden />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Pill
                href={p.price === "R$ 0" ? "/entrar" : `mailto:${site.email}?subject=${encodeURIComponent(`Quero o plano ${p.name}`)}`}
                tone={p.highlight ? "neon" : "dark"}
                className="relative mt-8"
              >
                {p.price === "R$ 0" ? "Começar grátis" : p.price === "Sob consulta" ? "Falar com a gente" : "Quero esse plano"}
              </Pill>
            </Wrapper>
          );
        })}
      </div>

      <Micro className="mb-3 mt-12 px-1">Perguntas frequentes · {site.name}</Micro>
      <Glass className="p-2 md:p-3">
        <dl className="divide-y divide-night/10">
          {faq.map((f, i) => (
            <div key={f.q} className="grid gap-2 px-4 py-6 md:grid-cols-[3rem_1fr_1.4fr] md:gap-6">
              <span className="font-mono text-[10px] opacity-40">{String(i + 1).padStart(2, "0")}</span>
              <dt className="text-xl font-medium tracking-[-0.025em]">{f.q}</dt>
              <dd className="text-sm leading-relaxed opacity-60">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Glass>
    </>
  );
}
