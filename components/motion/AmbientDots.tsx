"use client";

import { cores, comAlfa } from "@/lib/colors";
import { useEffect, useRef } from "react";

// Fundo interativo de todas as páginas do app: grade de pontos que respira em ondas
// e "acende" (cresce e fica neon) perto do cursor — eco da intro estilo Buttermax.
export default function AmbientDots() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const ctx = el.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gap = 30;
    const mouse = { x: -999, y: -999, tx: -999, ty: -999 };
    let raf = 0;
    let w = 0;
    let h = 0;

    const resize = () => {
      w = innerWidth;
      h = innerHeight;
      el.width = w;
      el.height = h;
    };
    const move = (e: PointerEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
    };
    resize();
    addEventListener("resize", resize);
    addEventListener("pointermove", move, { passive: true });

    const draw = (now: number) => {
      const t = now / 1000;
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      ctx.clearRect(0, 0, w, h);
      // cor dos pontos acompanha o tema (claro/escuro)
      const tinta = getComputedStyle(el).getPropertyValue("--color-night").trim() || cores.night;
      for (let x = gap / 2; x < w; x += gap) {
        for (let y = gap / 2; y < h; y += gap) {
          const wave = reduced ? 0.5 : Math.sin((x + y) * 0.008 - t * 1.2) * 0.5 + 0.5;
          const d = Math.hypot(x - mouse.x, y - mouse.y);
          const near = Math.max(0, 1 - d / 220);
          const r = 0.7 + wave * 0.6 + near * near * 3.2;
          ctx.fillStyle =
            near > 0.05
              ? comAlfa(cores["pontos-onda"], 0.12 + near * 0.65)
              : comAlfa(tinta, 0.05 + wave * 0.05);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const vis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", move);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0" />;
}
