"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

// Tema do painel: claro, escuro ou automático (segue o sistema). Fica salvo no navegador;
// o script em app/layout.tsx aplica antes da página aparecer, para não piscar.
export const TEMA_CHAVE = "oraklo-tema";
export type Tema = "claro" | "escuro" | "sistema";
const EVENTO = "oraklo-tema";

const escuroNoSistema = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

function lerTema(): Tema {
  try {
    const t = localStorage.getItem(TEMA_CHAVE);
    return t === "escuro" || t === "sistema" ? t : "claro";
  } catch {
    return "claro";
  }
}

function aplicar(t: Tema) {
  const escuro = t === "escuro" || (t === "sistema" && escuroNoSistema());
  document.documentElement.dataset.theme = escuro ? "dark" : "light";
}

export function salvarTema(t: Tema) {
  try {
    localStorage.setItem(TEMA_CHAVE, t);
  } catch {}
  aplicar(t);
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar); // outra aba mudou o tema
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

export function useTema(): Tema {
  const tema = useSyncExternalStore(assinar, lerTema, () => "claro" as Tema);
  // no automático, acompanha quando o sistema troca de claro para escuro
  useEffect(() => {
    aplicar(tema);
    if (tema !== "sistema") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const mudou = () => aplicar("sistema");
    mq.addEventListener("change", mudou);
    return () => mq.removeEventListener("change", mudou);
  }, [tema]);
  return tema;
}

/** Botão de sol/lua no topo do painel: alterna entre claro e escuro. */
export default function TemaToggle({ className = "", comRotulo = false }: { className?: string; comRotulo?: boolean }) {
  const tema = useTema();
  const escuro = tema === "escuro" || (tema === "sistema" && typeof window !== "undefined" && escuroNoSistema());
  const rotulo = escuro ? "Usar modo claro" : "Usar modo escuro";
  const Icone = escuro ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={() => salvarTema(escuro ? "claro" : "escuro")}
      title={rotulo}
      aria-label={rotulo}
      className={`flex min-h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-night/10 bg-white/70 px-3 text-xs hover:bg-white ${className}`}
    >
      <Icone size={15} aria-hidden />
      {comRotulo && <span>{escuro ? "Modo claro" : "Modo escuro"}</span>}
    </button>
  );
}

/** Escolha completa (Configurações): claro, escuro ou automático. */
export function TemaSeletor() {
  const tema = useTema();
  const opcoes: { id: Tema; rotulo: string; Icone: typeof Sun }[] = [
    { id: "claro", rotulo: "Claro", Icone: Sun },
    { id: "escuro", rotulo: "Escuro", Icone: Moon },
    { id: "sistema", rotulo: "Automático", Icone: Monitor },
  ];
  return (
    <div role="radiogroup" aria-label="Tema do painel" className="inline-flex flex-wrap gap-1 rounded-full border border-night/10 bg-white/60 p-1">
      {opcoes.map(({ id, rotulo, Icone }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={tema === id}
          onClick={() => salvarTema(id)}
          className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-sm transition-colors ${tema === id ? "bg-night font-medium text-white" : "hover:bg-white"}`}
        >
          <Icone size={15} aria-hidden /> {rotulo}
        </button>
      ))}
    </div>
  );
}
