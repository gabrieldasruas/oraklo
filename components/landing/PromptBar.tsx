"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";

// Termos que o placeholder "digita" sozinho (buscas reais por nome na base de empresas).
const IDEAS = ["transportes", "logística", "alimentos", "construtora", "distribuidora", "armazéns gerais"];

/**
 * Barra de "prompt" da intro: o placeholder se escreve e se apaga sozinho, como na
 * Higgsfield. Enviar leva à busca de empresas (se a pessoa não está logada,
 * o login devolve para a busca depois).
 */
export default function PromptBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(IDEAS[0]);
      return;
    }
    let idea = 0;
    let i = 0;
    let dir = 1;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const word = IDEAS[idea];
      i += dir;
      setTyped(word.slice(0, i));
      let wait = dir > 0 ? 70 + Math.random() * 60 : 28;
      if (i >= word.length) {
        dir = -1;
        wait = 1600;
      } else if (i <= 0) {
        dir = 1;
        idea = (idea + 1) % IDEAS.length;
        wait = 350;
      }
      timer = setTimeout(step, wait);
    };
    timer = setTimeout(step, 1800);
    return () => clearTimeout(timer);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = (value || typed).trim();
    router.push(`/empresas${q ? `?q=${encodeURIComponent(q)}` : ""}`);
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className="group relative mx-auto flex w-full max-w-2xl items-center gap-3 rounded-full border border-white/12 bg-white/[0.06] py-2 pl-7 pr-2 shadow-[0_30px_80px_-40px_color-mix(in_srgb,var(--color-neon)_45%,transparent)] backdrop-blur-xl transition-colors focus-within:border-neon/60 hover:border-white/25"
    >
      <label htmlFor="prompt" className="sr-only">
        Buscar empresas por nome
      </label>
      <span aria-hidden className="font-mono text-xs uppercase tracking-[0.2em] text-neon/80">
        Buscar
      </span>
      <div className="relative min-w-0 flex-1">
        <input
          id="prompt"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={80}
          autoComplete="off"
          className="h-12 w-full bg-transparent text-base text-white outline-none md:text-lg"
        />
        {!value && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-base text-white/45 md:text-lg">
            empresas de “{typed}
            <span className="mx-px inline-block h-5 w-[2px] animate-pulse bg-neon" />”
          </span>
        )}
      </div>
      <button
        type="submit"
        aria-label="Buscar"
        className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-night transition-all hover:bg-neon group-focus-within:bg-neon"
      >
        <ArrowUp size={20} aria-hidden />
      </button>
    </form>
  );
}
