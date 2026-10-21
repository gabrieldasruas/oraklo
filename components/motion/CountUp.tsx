"use client";

import { useLayoutEffect, useRef } from "react";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

// Conta do zero até o valor quando entra na tela.
// Aceita texto formatado ("684", "17,3%", "R$ 182 mil", "9.420") e mantém prefixo/sufixo.
// Sem JavaScript (ou com "reduzir movimento"), mostra o valor final direto.
export default function CountUp({ value, duration = 1.4 }: { value: string | number; duration?: number }) {
  const text = typeof value === "number" ? value.toLocaleString("pt-BR") : value;
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const match = text.match(/^(\D*?)(\d[\d.]*(?:,\d+)?)(.*)$/);
    if (!el || !match || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const [, prefix, num, suffix] = match;
    const decimals = num.includes(",") ? num.split(",")[1].length : 0;
    const target = Number(num.replace(/\./g, "").replace(",", "."));
    const fmt = (v: number) =>
      prefix + v.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

    el.textContent = fmt(0); // zera antes do primeiro desenho
    let raf = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / (duration * 1000), 1);
        el.textContent = fmt(target * easeOut(t));
        if (t < 1) raf = requestAnimationFrame(tick);
        else el.textContent = text;
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          io.disconnect();
          run();
        }
      },
      { rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.textContent = text;
    };
  }, [text, duration]);

  return (
    <span ref={ref} className="tabular-nums">
      {text}
    </span>
  );
}
