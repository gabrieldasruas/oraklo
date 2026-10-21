import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { Micro, WireArt } from "@/components/app/ui";
import AuthForm from "@/components/auth/AuthForm";
import Prospecta3D from "@/components/three/Prospecta3DLazy";
import DotGridIntro from "@/components/motion/DotGridIntro";
import { MaskText, Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = { title: `Entrar — ${site.name}` };

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const { next, erro } = await searchParams;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/painel";

  return (
    <div className="app-canvas relative min-h-dvh overflow-hidden font-display text-night">
      <DotGridIntro />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <WireArt
          kind="orbit"
          className="absolute left-1/2 top-1/2 size-[min(150vw,1000px)] -translate-x-1/2 -translate-y-1/2 text-night opacity-[0.1]"
        />
        <div className="aura-lime absolute -left-24 bottom-[-6rem] size-[26rem] rounded-full opacity-70 blur-3xl" />
        {/* nome gigante ao fundo, como o "Butter" do Buttermax */}
        <p className="absolute bottom-[-0.12em] left-1/2 -translate-x-1/2 select-none whitespace-nowrap text-[22vw] font-medium leading-none tracking-[-0.07em] text-night/[0.06]">
          {site.name.toUpperCase()}
        </p>
      </div>
      <div className="relative z-10 flex min-h-dvh flex-col px-4 py-6 md:px-10 md:py-8">
        <Link href="/" className="flex w-fit items-center gap-3" aria-label={`${site.name} — início`}>
          <span className="flex size-10 items-center justify-center rounded-xl bg-night">
            <span className="size-3 rounded-full bg-neon" />
          </span>
          <span className="text-xl font-semibold uppercase tracking-[-0.03em]">{site.name}</span>
        </Link>
        <main className="relative flex flex-1 flex-col items-center justify-center gap-8 py-10">
          {/* objeto 3D: acima do título no celular, à direita no desktop */}
          <Prospecta3D className="pointer-events-none -mb-8 size-48 xl:absolute xl:right-0 xl:top-1/2 xl:mb-0 xl:size-[460px] xl:-translate-y-1/2 2xl:right-[4%] 2xl:size-[540px]" />
          <div className="text-center">
            <Micro>Plataforma de prospecção B2B</Micro>
            <h1 className="mt-4 text-5xl font-medium tracking-[-0.05em] md:text-6xl">
              <MaskText delay={0.1}>Acesse sua conta</MaskText>
            </h1>
          </div>
          <Reveal index={3} className="flex w-full justify-center">
            <AuthForm next={safeNext} linkError={erro === "link"} />
          </Reveal>
        </main>
      </div>
    </div>
  );
}
