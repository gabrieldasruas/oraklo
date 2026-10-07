import type { Metadata } from "next";
import { site } from "@/content/site";
import { lists } from "@/content/app";
import PageHeader from "@/components/app/PageHeader";
import { Aura, Micro, Pill, WireArt } from "@/components/app/ui";

export const metadata: Metadata = { title: `Listas — ${site.name}` };

const tones = ["lime", "sun", "mint", "lilac", "coral", "night"] as const;
const arts = ["orbit", "waves", "rings", "fan"] as const;

export default function ListasPage() {
  return (
    <>
      <PageHeader
        index="06"
        title="Listas"
        description="Agrupe contatos por nicho ou campanha para organizar a abordagem."
        action={<Pill>Nova lista</Pill>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {lists.map((l, i) => {
          const tone = tones[i % tones.length];
          const dark = tone === "night";
          return (
            <Aura key={l.name} tone={tone} className="group relative min-h-[260px] p-6 transition-transform hover:-translate-y-1">
              <WireArt
                kind={arts[i % arts.length]}
                className={`absolute -bottom-10 -right-10 size-56 opacity-25 ${dark ? "text-neon" : "text-night"}`}
              />
              <div className="relative flex items-start justify-between">
                <Micro className="!opacity-70">{l.tag}</Micro>
                <span className="font-mono text-[10px] opacity-60">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="relative mt-10 text-7xl font-light leading-none tracking-[-0.06em]">{l.count}</p>
              <h2 className="relative mt-3 max-w-[16rem] text-lg font-medium leading-tight tracking-[-0.02em]">{l.name}</h2>
              <p className="relative mt-4 font-mono text-[10px] uppercase tracking-widest opacity-60">
                {l.updated} · {l.owner}
              </p>
            </Aura>
          );
        })}
      </div>
    </>
  );
}
