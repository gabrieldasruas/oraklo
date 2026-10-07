import type { Metadata } from "next";
import { site } from "@/content/site";
import { reports } from "@/content/app";
import PageHeader from "@/components/app/PageHeader";
import { Aura, Glass, Micro, Pill, WireArt } from "@/components/app/ui";

export const metadata: Metadata = { title: `Relatórios — ${site.name}` };

const tones = ["night", "lime", "sun", "mint"] as const;

function LineChart() {
  const W = 800;
  const H = 240;
  const pad = 14;
  const data = reports.weekly;
  const max = Math.max(...data.map((d) => d.value)) * 1.15;
  const pts = data.map((d, i) => [
    pad + (i * (W - 2 * pad)) / (data.length - 1),
    H - pad - (d.value / max) * (H - 2 * pad),
  ]);
  const line = "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L");
  const area = `${line} L${W - pad} ${H} L${pad} ${H} Z`;
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-60 w-full"
        role="img"
        aria-label="Gráfico de linha de reuniões agendadas por semana"
      >
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b8ff3c" stopOpacity="0.55" />
            <stop offset="1" stopColor="#b8ff3c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="#0b0b0c" strokeOpacity="0.08" strokeDasharray="3 5" />
        ))}
        <path d={area} fill="url(#area)" />
        <path d={line} fill="none" stroke="#0b0b0c" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke="#0b0b0c" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between px-1">
        {data.map((d) => (
          <span key={d.week} className="font-mono text-[10px] uppercase tracking-widest opacity-45">
            {d.week}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RelatoriosPage() {
  const total = reports.weekly.reduce((s, w) => s + w.value, 0);
  const maxLeads = Math.max(...reports.bySegment.map((s) => s.leads));
  return (
    <>
      <PageHeader
        index="05"
        title="Relatórios"
        description="Acompanhe o desempenho da prospecção por período e por segmento."
        action={<Pill tone="ghost">Exportar</Pill>}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {reports.kpis.map((k, i) => (
          <Aura key={k.label} tone={tones[i]} className="relative min-h-[150px] p-6">
            <WireArt
              kind="waves"
              className={`absolute inset-0 size-full opacity-20 ${tones[i] === "night" ? "text-neon" : "text-night"}`}
            />
            <Micro className="relative !opacity-70">{k.label}</Micro>
            <p className="relative mt-6 text-5xl font-light tracking-[-0.05em]">{k.value}</p>
          </Aura>
        ))}

        <Glass className="p-7 lg:col-span-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Micro>Reuniões agendadas por semana</Micro>
              <p className="mt-3 text-6xl font-light tracking-[-0.05em]">{total}</p>
            </div>
            <Micro>Últimas 8 semanas</Micro>
          </div>
          <div className="mt-4">
            <LineChart />
          </div>
        </Glass>

        <Glass className="p-7 lg:col-span-4">
          <Micro>Desempenho por segmento</Micro>
          <ul className="mt-6 divide-y divide-night/10">
            {reports.bySegment.map((s) => (
              <li key={s.name} className="grid items-center gap-4 py-5 md:grid-cols-[1.4fr_2fr_auto_auto]">
                <span className="font-medium tracking-[-0.01em]">{s.name}</span>
                <div className="relative h-px bg-night/15">
                  <div className="absolute inset-y-0 left-0 h-[3px] -translate-y-px bg-night" style={{ width: `${(s.leads / maxLeads) * 100}%` }} />
                </div>
                <span className="font-mono text-xs opacity-60">{s.leads} leads</span>
                <span className="flex items-center gap-4 text-sm tabular-nums">
                  <span>{s.reply.toFixed(1).replace(".", ",")}%</span>
                  <span className="rounded-full bg-night px-3 py-1 font-mono text-xs text-neon">{s.meetings} reuniões</span>
                </span>
              </li>
            ))}
          </ul>
        </Glass>
      </div>
    </>
  );
}
