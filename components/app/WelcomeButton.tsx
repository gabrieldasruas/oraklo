"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

const TARGET = "/painel";

// Botão de boas-vindas: ao clicar, uma onda neon cobre a tela e leva às seções.
export default function WelcomeButton({ tone = "dark", label = "Bem-vindo" }: { tone?: "dark" | "neon"; label?: string }) {
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
        className={`group flex min-h-16 cursor-pointer items-center gap-5 rounded-full py-2 pl-9 pr-2 text-xl font-medium tracking-[-0.02em] transition-transform hover:-translate-y-1 ${
          tone === "neon"
            ? "bg-neon text-night shadow-[0_20px_60px_-15px_rgba(184,255,60,0.7)]"
            : "bg-night text-white shadow-[0_20px_50px_-20px_rgba(10,10,10,0.6)]"
        }`}
      >
        {label}
        <span
          className={`flex size-12 items-center justify-center rounded-full transition-transform group-hover:rotate-45 ${
            tone === "neon" ? "bg-night text-neon" : "bg-neon text-night"
          }`}
        >
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
