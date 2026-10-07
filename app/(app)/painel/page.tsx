import type { Metadata } from "next";
import { site } from "@/content/site";
import { overview } from "@/content/app";
import PageHeader from "@/components/app/PageHeader";
import { Aura, Glass, Micro, WireArt } from "@/components/app/ui";

export const metadata: Metadata = { title: `Visão geral — ${site.name}` };

export default function PainelPage() {
  const [leads, response, meetings, revenue] = overview.kpis;
  return (
    <>
      <PageHeader
        index="01"
        title="Visão geral"
        description="Resumo da sua prospecção nos últimos 30 dias."
      />

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Destaque principal */}
        <Glass className="relative overflow-hidden p-7 lg:col-span-7 lg:min-h-[340px]">
          <WireArt kind="orbit" spin className="absolute -right-16 -top-16 size-[26rem] text-night opacity-20" />
          <Micro>{leads.label}</Micro>
          <p className="mt-6 text-[7rem] font-light leading-none tracking-[-0.06em] md:text-[10rem]">
            {leads.value}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="rounded-full bg-night px-3 py-1 font-mono text-xs text-neon">{leads.delta}</span>
            <span className="text-sm opacity-55">vs. período anterior</span>
          </div>
        </Glass>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5">
          <Aura tone="lime" className="relative min-h-[170px] p-6 sm:col-span-2">
            <WireArt kind="waves" className="absolute inset-0 size-full text-night opacity-25" />
            <Micro className="relative !opacity-70">{response.label}</Micro>
            <p className="relative mt-6 text-6xl font-light tracking-[-0.05em]">{response.value}</p>
            <p className="relative mt-2 font-mono text-xs">{response.delta}</p>
          </Aura>
          <Aura tone="sun" className="relative min-h-[160px] p-6">
            <WireArt kind="fan" className="absolute -bottom-6 -right-6 size-40 text-night opacity-25" />
            <Micro className="relative !opacity-70">{meetings.label}</Micro>
            <p className="relative mt-5 text-5xl font-light tracking-[-0.05em]">{meetings.value}</p>
            <p className="relative mt-2 font-mono text-xs">{meetings.delta}</p>
          </Aura>
          <Aura tone="night" className="relative min-h-[160px] p-6">
            <WireArt kind="rings" className="absolute -bottom-8 -right-8 size-40 text-neon opacity-30" />
            <Micro className="relative !opacity-60">{revenue.label}</Micro>
            <p className="relative mt-5 text-3xl font-light tracking-[-0.04em]">{revenue.value}</p>
            <p className="relative mt-2 font-mono text-xs text-neon">{revenue.delta}</p>
          </Aura>
        </div>

        {/* Funil */}
        <Glass className="p-7 lg:col-span-7">
          <Micro>Funil de prospecção</Micro>
          <ul className="mt-6 space-y-6">
            {overview.funnel.map((f, i) => (
              <li key={f.label}>
                <div className="flex items-baseline justify-between">
                  <span className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-[10px] opacity-40">{String(i + 1).padStart(2, "0")}</span>
                    {f.label}
                  </span>
                  <span className="text-3xl font-light tracking-[-0.04em] tabular-nums">
                    {f.value.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="relative mt-2 h-px bg-night/15">
                  <div className="absolute inset-y-0 left-0 h-[3px] -translate-y-px bg-night" style={{ width: `${Math.max(f.pct, 1.5)}%` }} />
                  <div
                    className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-neon ring-1 ring-night"
                    style={{ left: `calc(${Math.max(f.pct, 1.5)}% - 5px)` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Glass>

        {/* Atividade */}
        <Glass className="p-7 lg:col-span-5">
          <Micro>Atividade recente</Micro>
          <ol className="relative mt-6 space-y-5 border-l border-night/15 pl-6">
            {overview.activity.map((a) => (
              <li key={a.who + a.when} className="relative text-sm">
                <span className="absolute -left-[29px] top-1.5 size-2 rounded-full bg-night" />
                <span className="font-medium">{a.who}</span> <span className="opacity-60">{a.what}</span>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-widest opacity-40">{a.when}</span>
              </li>
            ))}
          </ol>
        </Glass>
      </div>
    </>
  );
}
