import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { requireUser } from "@/lib/auth";
import { getLists, getQuotaUsage } from "@/lib/lists";
import PageHeader from "@/components/app/PageHeader";
import { Aura, Glass, Micro, Pill, WireArt } from "@/components/app/ui";

export const metadata: Metadata = { title: `Listas — ${site.name}` };

const tones = ["lime", "sun", "mint", "lilac", "coral", "night"] as const;
const arts = ["orbit", "waves", "rings", "fan"] as const;

function when(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function ListasPage() {
  const user = await requireUser();
  const [lists, usage] = await Promise.all([getLists(user.id), getQuotaUsage(user.workspaceId)]);

  return (
    <>
      <PageHeader
        index="06"
        title="Listas"
        description="Agrupe empresas por nicho ou campanha. Crie uma lista a partir de um nicho na Segmentação ou de uma busca em Empresas."
        action={<Pill href="/empresas">Nova lista</Pill>}
      />
      <Micro className="mb-4 px-1">
        Exportações este mês: {usage.used.toLocaleString("pt-BR")} de {usage.quota.toLocaleString("pt-BR")} linhas
      </Micro>

      {lists.length === 0 ? (
        <Glass className="flex flex-col items-center gap-5 px-6 py-16 text-center">
          <p className="max-w-md text-sm opacity-70">
            Nenhuma lista ainda. Comece por um nicho pronto ou monte sua própria busca com filtros.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Pill href="/segmentacao" tone="ghost">Ver nichos</Pill>
            <Pill href="/empresas">Buscar empresas</Pill>
          </div>
        </Glass>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lists.map((l, i) => {
            const tone = tones[i % tones.length];
            const dark = tone === "night";
            return (
              <Link key={l.id} href={`/listas/${l.id}`} className="block rounded-[28px] focus-visible:outline-2 focus-visible:outline-offset-4">
                <Aura tone={tone} className="group relative min-h-[260px] p-6 transition-transform hover:-translate-y-1">
                  <WireArt
                    kind={arts[i % arts.length]}
                    className={`absolute -bottom-10 -right-10 size-56 opacity-25 ${dark ? "text-neon" : "text-night"}`}
                  />
                  <div className="relative flex items-start justify-between">
                    <Micro className="!opacity-70">{l.tag ?? "Lista"}</Micro>
                    <span className="font-mono text-[10px] opacity-60">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <p className="relative mt-10 text-7xl font-light leading-none tracking-[-0.06em] tabular-nums">
                    {l.count.toLocaleString("pt-BR")}
                  </p>
                  <h2 className="relative mt-3 max-w-[16rem] text-lg font-medium leading-tight tracking-[-0.02em]">{l.name}</h2>
                  <p className="relative mt-4 font-mono text-[10px] uppercase tracking-widest opacity-60">
                    {when(l.createdAt)} · {l.mine ? "Você" : "Equipe"}
                  </p>
                </Aura>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
