import type { Metadata } from "next";
import { site } from "@/content/site";
import { sequences } from "@/content/app";
import PageHeader from "@/components/app/PageHeader";
import { Glass, Micro, Pill } from "@/components/app/ui";

export const metadata: Metadata = { title: `Sequências — ${site.name}` };

const dot: Record<string, string> = {
  Ativa: "bg-neon ring-1 ring-night",
  Pausada: "bg-amber-400",
  Rascunho: "bg-night/25",
};

// Linha fina com um nó por etapa.
function Steps({ n }: { n: number }) {
  return (
    <div className="flex items-center" aria-label={`${n} etapas`} role="img">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="flex items-center">
          <span className={`size-2.5 rounded-full border border-night ${i === 0 ? "bg-night" : "bg-white"}`} />
          {i < n - 1 && <span className="h-px w-5 bg-night/30" />}
        </span>
      ))}
    </div>
  );
}

export default function SequenciasPage() {
  return (
    <>
      <PageHeader
        index="04"
        title="Sequências"
        description="Cadências de e-mail e ligação para abordar seus leads de forma consistente."
        action={<Pill>Nova sequência</Pill>}
      />
      <Glass className="p-2 md:p-3">
        <ul className="divide-y divide-night/10">
          {sequences.map((s, i) => (
            <li
              key={s.name}
              className="grid items-center gap-x-6 gap-y-3 rounded-2xl px-4 py-5 transition-colors hover:bg-white/60 md:grid-cols-[2rem_minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_6rem]"
            >
              <span className="hidden font-mono text-[10px] opacity-40 md:block">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-lg font-medium tracking-[-0.02em]">{s.name}</p>
                <Micro className="mt-1">{s.steps} etapas</Micro>
              </div>
              <Steps n={s.steps} />
              <div>
                <Micro>Contatos</Micro>
                <p className="mt-1 text-2xl font-light tracking-[-0.04em] tabular-nums">{s.enrolled}</p>
              </div>
              <div>
                <Micro>Resposta</Micro>
                <p className="mt-1 text-2xl font-light tracking-[-0.04em] tabular-nums">
                  {s.reply.toFixed(1).replace(".", ",")}%
                </p>
              </div>
              <span className="flex w-fit items-center gap-2 rounded-full border border-night/10 bg-white/70 px-3 py-1.5 text-xs">
                <span className={`size-2 rounded-full ${dot[s.status]}`} /> {s.status}
              </span>
            </li>
          ))}
        </ul>
      </Glass>
    </>
  );
}
