"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

const TARGET = "/painel";

// Botão de boas-vindas: ao clicar, uma onda neon cobre a tela e leva às seções.
export default function WelcomeButton() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    router.prefetch(TARGET);
    return () => clearTimeout(timer.current);
  }, [router]);

  function go() {
    if (leaving) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      router.push(TARGET);
      return;
    }
    setLeaving(true);
    timer.current = setTimeout(() => router.push(TARGET), 650);
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        className="group flex min-h-16 cursor-pointer items-center gap-5 rounded-full bg-night py-2 pl-9 pr-2 text-xl font-medium tracking-[-0.02em] text-white shadow-[0_20px_50px_-20px_rgba(10,10,10,0.6)] transition-transform hover:-translate-y-1"
      >
        Bem-vindo
        <span className="flex size-12 items-center justify-center rounded-full bg-neon text-night transition-transform group-hover:rotate-45">
          <ArrowUpRight size={22} aria-hidden />
        </span>
      </button>

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50 bg-neon transition-[clip-path] duration-[650ms] ease-in-out"
        style={{
          clipPath: leaving ? "circle(150% at 50% 70%)" : "circle(0% at 50% 70%)",
        }}
      />
    </>
  );
}
