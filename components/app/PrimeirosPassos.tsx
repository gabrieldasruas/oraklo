import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Micro } from "@/components/app/ui";

export type Passo = { t: string; d: string; href: string; feito: boolean };

/** Checklist de quem está começando. Some quando tudo estiver feito. */
export default function PrimeirosPassos({ passos }: { passos: Passo[] }) {
  const feitos = passos.filter((p) => p.feito).length;
  if (feitos === passos.length) return null;
  const proximo = passos.find((p) => !p.feito);
  return (
    <section aria-label="Primeiros passos" className="relative mb-4 overflow-hidden rounded-[28px] bg-night p-6 text-white md:p-8">
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full opacity-35 blur-3xl" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-neon) 70%, transparent), transparent 70%)" }} />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div>
          <Micro className="!text-neon !opacity-90">Primeiros passos</Micro>
          <h2 className="mt-2 text-3xl font-light tracking-[-0.04em] md:text-4xl">
            {feitos === 0 ? "Vamos montar sua prospecção" : `Faltam ${passos.length - feitos} passos`}
          </h2>
          <p className="mt-1 text-sm text-white/55">Leva uns 10 minutos e deixa a busca, o e-mail e os relatórios funcionando para você.</p>
        </div>
        <div className="min-w-[200px]">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/45">Progresso</span>
            <span className="text-2xl font-light tabular-nums">
              {feitos}/{passos.length}
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {passos.map((p) => (
              <span key={p.t} className={`h-1.5 flex-1 rounded-full ${p.feito ? "bg-neon" : "bg-white/15"}`} />
            ))}
          </div>
        </div>
      </div>

      <ol className="relative mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {passos.map((p, i) => {
          const atual = p === proximo;
          return (
            <li key={p.t}>
              <Link
                href={p.href}
                className={`group flex h-full items-start gap-3 rounded-[20px] border p-4 transition-colors ${
                  p.feito ? "border-white/5 bg-white/[0.03] opacity-55" : atual ? "border-neon/60 bg-white/[0.07] hover:bg-white/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              >
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] ${p.feito ? "bg-neon text-night" : atual ? "border border-neon text-neon" : "border border-white/25 text-white/60"}`}>
                  {p.feito ? <Check size={14} /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm font-medium ${p.feito ? "line-through" : ""}`}>{p.t}</span>
                  <span className="mt-0.5 block text-xs text-white/50">{p.d}</span>
                </span>
                {!p.feito && <ArrowRight size={15} aria-hidden className={`mt-1 shrink-0 transition-transform group-hover:translate-x-0.5 ${atual ? "text-neon" : "text-white/40"}`} />}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
