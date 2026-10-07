import Link from "next/link";
import { site } from "@/content/site";
import { Micro, WireArt } from "@/components/app/ui";
import WelcomeButton from "@/components/app/WelcomeButton";

const links = [
  { label: "Produto", href: "/produto" },
  { label: "Histórias", href: "/historias" },
  { label: "Preços", href: "/precos" },
];

export default function WelcomePage() {
  return (
    <div className="app-canvas relative min-h-screen overflow-hidden font-display text-night">
      {/* Arte de fundo */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <WireArt
          kind="orbit"
          spin
          className="absolute left-1/2 top-1/2 size-[min(150vw,1100px)] -translate-x-1/2 -translate-y-1/2 text-night opacity-[0.13]"
        />
        <div className="aura-lime absolute -left-24 bottom-[-6rem] size-[26rem] rounded-full opacity-70 blur-3xl" />
        <div className="aura-coral absolute -right-24 top-[-5rem] size-[24rem] rounded-full opacity-60 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col px-5 py-6 md:px-10 md:py-8">
        {/* Topo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-night">
              <span className="size-3 rounded-full bg-neon" />
            </span>
            <span className="text-xl font-semibold uppercase tracking-[-0.03em]">{site.name}</span>
          </div>
          <Micro className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-neon ring-1 ring-night/40" /> Sistema online · BRT
          </Micro>
        </div>

        {/* Centro */}
        <main className="flex flex-1 flex-col items-center justify-center text-center">
          <Micro>Plataforma de prospecção B2B</Micro>
          <h1 className="mt-6 text-[clamp(4.2rem,17vw,13rem)] font-medium leading-[0.85] tracking-[-0.06em]">
            Olá
            <span className="ml-1 inline-block size-[0.14em] rounded-full bg-neon align-baseline ring-2 ring-night/30" />
          </h1>
          <p className="mt-8 max-w-md text-base leading-relaxed opacity-60 md:text-lg">
            Encontre os clientes certos, organize seus contatos e acompanhe cada abordagem em um só lugar.
          </p>
          <div className="mt-10">
            <WelcomeButton />
          </div>
        </main>

        {/* Rodapé */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Micro>© {new Date().getFullYear()} {site.name}</Micro>
          <nav aria-label="Mais páginas" className="flex gap-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-55 hover:opacity-100"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
