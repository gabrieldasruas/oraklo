"use client";

import { useRouter } from "next/navigation";
import { PanelLeft, PanelTop } from "lucide-react";

export const COOKIE_MENU = "oraklo-menu";

/** Alterna entre o menu no topo e o menu lateral (guardado num cookie, sem piscar ao carregar). */
export default function MenuToggle({ para, className = "" }: { para: "lateral" | "topo"; className?: string }) {
  const router = useRouter();
  const Icone = para === "lateral" ? PanelLeft : PanelTop;
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `${COOKIE_MENU}=${para}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
      title={para === "lateral" ? "Usar menu lateral" : "Usar menu no topo"}
      aria-label={para === "lateral" ? "Usar menu lateral" : "Usar menu no topo"}
      className={`flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-night/10 bg-white/70 px-3 text-xs hover:bg-white ${className}`}
    >
      <Icone size={15} aria-hidden />
      <span className="hidden xl:inline">{para === "lateral" ? "Menu lateral" : "Menu no topo"}</span>
    </button>
  );
}
