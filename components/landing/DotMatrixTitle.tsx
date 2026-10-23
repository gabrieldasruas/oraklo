"use client";

import { cores, misturar } from "@/lib/colors";
import { useEffect, useRef } from "react";

// sx/sy: de onde o ponto sai; tx/ty: seu lugar no texto; ox/oy: desvio causado pelo mouse.
type Dot = { sx: number; sy: number; tx: number; ty: number; ox: number; oy: number; vx: number; vy: number; delay: number; seed: number };

const FLY = 1.1; // segundos que cada ponto leva para chegar
const easeOut = (p: number) => 1 - Math.pow(1 - p, 4);

/**
 * Título em matriz de pontos (estilo "Supercomputer" da Higgsfield):
 * o texto é desenhado fora da tela, amostrado numa grade e cada ponto voa
 * de uma posição aleatória até o seu lugar. A montagem é por tempo (não por quadro),
 * então termina igual em qualquer máquina. Depois o cursor espalha os pontos e eles
 * voltam com mola; uma faixa de brilho neon varre o título de tempos em tempos.
 */
export default function DotMatrixTitle({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    let dots: Dot[] = [];
    let gap = 7;
    let raf = 0;
    let start = 0;
    let last = 0;
    let w = 0;
    let h = 0;

    const build = () => {
      w = canvas.clientWidth;
      // tamanho da fonte acompanha a largura (como um clamp)
      const fs = Math.min(190, Math.max(60, w / (text.length * 0.56)));
      gap = Math.max(4, Math.round(fs / 24));
      h = Math.round(fs * 1.12);
      canvas.style.height = `${h}px`;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const o = off.getContext("2d")!;
      o.font = `600 ${fs}px ${getComputedStyle(canvas).fontFamily}`;
      o.textAlign = "center";
      o.textBaseline = "middle";
      o.fillStyle = cores.branco;
      // letter-spacing apertado, como os títulos do Oraklo
      (o as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${-fs * 0.04}px`;
      o.fillText(text, w / 2, h / 2 + fs * 0.04);
      const data = o.getImageData(0, 0, w, h).data;

      dots = [];
      for (let y = gap / 2; y < h; y += gap) {
        for (let x = gap / 2; x < w; x += gap) {
          if (data[(Math.floor(y) * w + Math.floor(x)) * 4 + 3] > 140) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.max(w, h) * (0.35 + Math.random() * 0.65);
            dots.push({
              sx: w / 2 + Math.cos(a) * r,
              sy: h / 2 + Math.sin(a) * r * 0.6,
              tx: x,
              ty: y,
              ox: 0,
              oy: 0,
              vx: 0,
              vy: 0,
              delay: (x / w) * 0.55 + Math.random() * 0.3,
              seed: Math.random(),
            });
          }
        }
      }
      start = last = performance.now();
    };

    const draw = (now: number) => {
      const t = (now - start) / 1000;
      // passo de tempo normalizado para 60 fps (a mola do mouse anda igual em qualquer taxa)
      const k = Math.min(3, (now - last) / 16.67);
      last = now;
      ctx.clearRect(0, 0, w, h);
      const sweep = ((t * 0.32) % 1.7) - 0.35;
      const r0 = gap * 0.34;

      for (const d of dots) {
        const p = reduced ? 1 : Math.min(1, Math.max(0, (t - d.delay) / FLY));
        const e = easeOut(p);
        let x = d.sx + (d.tx - d.sx) * e;
        let y = d.sy + (d.ty - d.sy) * e;

        if (p >= 1) {
          // mouse empurra; mola traz de volta
          const dx = x + d.ox - mouse.x;
          const dy = y + d.oy - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 85) {
            const f = (1 - dist / 85) * 3.2 * k;
            d.vx += (dx / (dist + 0.01)) * f;
            d.vy += (dy / (dist + 0.01)) * f;
          }
          d.vx += -d.ox * 0.08 * k;
          d.vy += -d.oy * 0.08 * k;
          const damp = Math.pow(0.82, k);
          d.vx *= damp;
          d.vy *= damp;
          d.ox += d.vx * k;
          d.oy += d.vy * k;
          x += d.ox;
          y += d.oy;
        }

        const glow = Math.max(0, 1 - Math.abs(d.tx / w - sweep) * 6);
        const twinkle = 0.8 + Math.sin(t * 3 + d.seed * 20) * 0.2;
        ctx.globalAlpha = (0.2 + e * 0.8) * twinkle;
        ctx.fillStyle = glow > 0.05 ? misturar(cores["matriz-base"], cores.neon, glow) : cores["matriz-ponto"];
        const r = r0 * (1 + glow * 0.45) * (0.6 + e * 0.4);
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };

    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const leave = () => {
      mouse.x = mouse.y = -9999;
    };

    let ro: ResizeObserver | undefined;
    let alive = true;
    document.fonts.ready.then(() => {
      if (!alive) return;
      build();
      raf = requestAnimationFrame(draw);
      ro = new ResizeObserver(() => {
        if (Math.abs(canvas.clientWidth - w) > 4) build();
      });
      ro.observe(canvas);
    });
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, [text]);

  return (
    <>
      <h1 className="sr-only">{text}</h1>
      <canvas ref={ref} aria-hidden className={`block w-full font-display ${className}`} />
    </>
  );
}
