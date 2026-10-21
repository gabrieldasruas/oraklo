import Link from "next/link";
import { site } from "@/content/site";
import { niches } from "@/content/app";
import { Micro } from "@/components/app/ui";
import WelcomeButton from "@/components/app/WelcomeButton";
import DotMatrixTitle from "@/components/landing/DotMatrixTitle";
import FloatingCards from "@/components/landing/FloatingCards";
import PromptBar from "@/components/landing/PromptBar";

const links = [
  { label: "Produto", href: "/produto" },
  { label: "Histórias", href: "/historias" },
  { label: "Preços", href: "/precos" },
];

// Ícone do app aceso (o logo do Prospecta como "app icon", à la Higgsfield).
function GlowIcon() {
  return (
    <div className="icon-drop relative mx-auto size-24 md:size-28" style={{ animationDelay: "0.2s" }}>
      <div className="icon-glow relative flex size-full items-center justify-center overflow-hidden rounded-[30%] bg-[#111113]">
        {/* grade interna */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "12px 12px",
          }}
        />
        {/* brilho de vidro */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
        <span className="relative size-[30%] rounded-full bg-neon shadow-[0_0_30px_6px_rgba(184,255,60,0.8)]" />
      </div>
      {/* moldura metálica */}
      <div aria-hidden className="pointer-events-none absolute -inset-1.5 -z-10 rounded-[32%] bg-gradient-to-b from-zinc-300 to-zinc-600" />
    </div>
  );
}

export default function WelcomePage() {
  const segments = niches.map((n) => n.name);

  return (
    <div className="relative min-h-screen overflow-hidden bg-night font-display text-white">
      {/* Fundo: brilho neon central + grade em perspectiva + granulado */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(42% 38% at 50% 34%, rgba(184,255,60,0.22), transparent 70%), radial-gradient(40% 40% at 0% 100%, rgba(120,140,255,0.14), transparent 70%), radial-gradient(35% 35% at 100% 0%, rgba(255,150,110,0.1), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[55%] opacity-50 [mask-image:linear-gradient(to_top,black,transparent)]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(184,255,60,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(184,255,60,0.18) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            transform: "perspective(600px) rotateX(58deg)",
            transformOrigin: "bottom",
          }}
        />
      </div>

      <FloatingCards />

      <div className="relative z-10 flex min-h-screen flex-col px-5 py-6 md:px-10 md:py-8">
        {/* Topo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <span className="size-3 rounded-full bg-neon" />
            </span>
            <span className="text-xl font-semibold uppercase tracking-[-0.03em]">{site.name}</span>
          </div>
          <Micro className="hidden items-center gap-2 !opacity-70 sm:flex">
            <span className="size-1.5 animate-pulse rounded-full bg-neon" /> Sistema online · BRT
          </Micro>
        </div>

        {/* Centro */}
        <main className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <GlowIcon />
          <div className="mt-8 w-full max-w-4xl">
            <DotMatrixTitle text={site.name} />
          </div>
          <p className="reveal mt-4 max-w-md text-base leading-relaxed text-white/60 md:text-lg" style={{ animationDelay: "1.4s" }}>
            Encontre os clientes certos, organize seus contatos e acompanhe cada abordagem em um só lugar.
          </p>
          <div className="reveal mt-9 w-full" style={{ animationDelay: "1.6s" }}>
            <PromptBar />
          </div>
          <div className="reveal mt-7" style={{ animationDelay: "1.8s" }}>
            <WelcomeButton tone="neon" label="Entrar no painel" />
          </div>
        </main>

        {/* Faixa de segmentos rolando */}
        <div aria-hidden className="relative -mx-5 overflow-hidden border-y border-white/10 py-3 md:-mx-10">
          <div className="marquee flex w-max gap-10 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.25em] text-white/45">
            {[...segments, ...segments].map((s, i) => (
              <span key={i} className="flex items-center gap-10">
                {s}
                <span className="size-1.5 rounded-full bg-neon/70" />
              </span>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-5">
          <Micro className="!opacity-50">© {new Date().getFullYear()} {site.name}</Micro>
          <nav aria-label="Mais páginas" className="flex gap-6">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55 hover:text-neon"
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
