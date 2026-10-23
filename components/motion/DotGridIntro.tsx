"use client";

import { cores, misturar } from "@/lib/colors";
import { useEffect, useRef, useState } from "react";

const KEY = "prospecta:intro-vista";
const DURATION = 1700; // ms com a grade visível antes de sumir

// Intro estilo Buttermax: grade de pontos pulsando em ondas diagonais,
// que brilham perto do cursor. Aparece só na primeira visita da sessão.
export default function DotGridIntro() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let seen = true;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
      sessionStorage.setItem(KEY, "1");
    } catch {}
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 768;
    if (!seen && !reduced && !small) setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const el = canvas.current!;
    const ctx = el.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    let raf = 0;

    const resize = () => {
      el.width = innerWidth * dpr;
      el.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const move = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    resize();
    addEventListener("resize", resize);
    addEventListener("pointermove", move);

    const gap = 34;
    const start = performance.now();
    const draw = (now: number) => {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let x = gap / 2; x < innerWidth; x += gap) {
        for (let y = gap / 2; y < innerHeight; y += gap) {
          const wave = Math.sin((x + y) * 0.012 - t * 3.2) * 0.5 + 0.5; // 0..1
          const d = Math.hypot(x - mouse.x, y - mouse.y);
          const near = Math.max(0, 1 - d / 180);
          const r = 1.2 + wave * 4.2 + near * 5;
          // mistura o ponto da intro com o neon conforme a onda
          const a = 0.18 + wave * 0.7 + near * 0.3;
          ctx.beginPath();
          ctx.fillStyle = misturar(cores["intro-ponto"], cores.neon, wave, Math.min(a, 1));
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const out = setTimeout(() => setLeaving(true), DURATION);
    const done = setTimeout(() => setShow(false), DURATION + 750);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(out);
      clearTimeout(done);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", move);
    };
  }, [show]);

  if (!show) return null;
  return (
    <div
      aria-hidden
      onClick={() => setLeaving(true)}
      className={`fixed inset-0 z-50 bg-night transition-[opacity,transform,filter] duration-700 ease-out ${
        leaving ? "pointer-events-none scale-110 opacity-0 blur-sm" : "opacity-100"
      }`}
    >
      <canvas ref={canvas} className="size-full" />
      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-neon/70">
        Oraklo · prevendo seus próximos clientes
      </p>
    </div>
  );
}
