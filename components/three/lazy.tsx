"use client";

import dynamic from "next/dynamic";

// Versões carregadas sob demanda das cenas 3D: o Three.js só baixa na página que usa.
// Os placeholders têm a mesma altura para a página não "pular" quando a cena chega.

const dark = (h: string) =>
  function Placeholder() {
    return <div className={`animate-pulse rounded-[28px] bg-night ${h}`} aria-hidden />;
  };

export const FunnelHero = dynamic(() => import("./scenes/FunnelHero"), {
  ssr: false,
  loading: dark("h-[520px] md:h-[600px]"),
});

export const LeadsConstellation = dynamic(() => import("./scenes/LeadsConstellation"), {
  ssr: false,
  loading: dark("h-[460px] md:h-[540px]"),
});

export const RingVortex = dynamic(() => import("./scenes/NicheScenes").then((m) => m.RingVortex), { ssr: false });

export const NicheShape = dynamic(() => import("./scenes/NicheScenes").then((m) => m.NicheShape), {
  ssr: false,
  loading: () => <div className="h-56" aria-hidden />,
});
