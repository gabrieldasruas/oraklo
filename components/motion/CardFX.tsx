"use client";

import { useEffect } from "react";

const CARDS = ".app-main .glass, .app-main [class*='aura-']:not(.blur-3xl)";

// Efeito global nos cards do app: luz neon que segue o mouse e leve inclinação 3D.
// Um único listener para a página inteira — não precisa mexer em cada página.
export default function CardFX() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce), (hover: none)").matches) return;
    let current: HTMLElement | null = null;

    const reset = (el: HTMLElement) => {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--spot", "0");
    };

    const move = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest?.(CARDS) as HTMLElement | null;
      if (current && current !== card) reset(current);
      current = card;
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width; // 0..1
      const y = (e.clientY - r.top) / r.height;
      // cards grandes inclinam menos
      const k = Math.min(1, 420 / Math.max(r.width, r.height));
      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);
      card.style.setProperty("--rx", `${(0.5 - y) * 5 * k}deg`);
      card.style.setProperty("--ry", `${(x - 0.5) * 6 * k}deg`);
      card.style.setProperty("--spot", "1");
    };
    const leave = () => current && reset(current);

    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, []);

  return null;
}
