"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronUp, ChevronDown, LogOut } from "lucide-react";
import { signOut } from "@/app/entrar/actions";
import { appNav } from "@/components/app/nav";
import { Micro } from "@/components/app/ui";
import MenuToggle from "./MenuToggle";
import { site } from "@/content/site";

// Painel enxuto no topo: serve para o usuário se localizar entre as seções principais.
const initials = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

export default function TopPanel({ user }: { user: { name: string; workspaceName: string } | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(pathname === "/painel");

  // Expandido na Visão geral (só em telas largas); recolhido nas demais.
  useEffect(() => {
    setOpen(pathname === "/painel" && window.matchMedia("(min-width: 1024px)").matches);
  }, [pathname]);

  return (
    <header className={`glass z-30 p-3 md:p-4 ${open ? "" : "sticky top-3"}`}>
      <div className="flex items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={`${site.name} — início`}>
          <span className="flex size-10 items-center justify-center rounded-xl bg-night">
            <span className="size-3 rounded-full bg-neon" />
          </span>
          <span className="text-xl font-semibold uppercase tracking-[-0.03em]">{site.name}</span>
        </Link>

        {!open && (
          <nav
            aria-label="Seções"
            className="mx-2 hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex"
          >
            {appNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm transition-colors ${
                    active
                      ? item.destaque
                        ? "bg-night font-medium text-neon"
                        : "bg-night font-medium text-white"
                      : item.destaque
                        ? "bg-neon font-medium text-night shadow-[0_8px_20px_-10px_color-mix(in_srgb,var(--color-neon-escuro)_90%,transparent)] hover:bg-neon-claro"
                        : "hover:bg-white/80"
                  }`}
                >
                  {item.destaque && <item.icon size={14} aria-hidden />}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          {open && (
            <Micro className="hidden items-center gap-2 md:flex">
              <span className="size-1.5 rounded-full bg-neon ring-1 ring-night/40" /> Sistema online · BRT
            </Micro>
          )}
          <MenuToggle para="lateral" className="hidden lg:flex" />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="top-panel-body"
            className="flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-night/10 bg-white/70 px-4 text-xs hover:bg-white"
          >
            {open ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
            <span className="hidden sm:inline">{open ? "Recolher" : "Seções"}</span>
          </button>
          {user ? (
            <>
              <Link
                href="/configuracoes"
                aria-label={`${user.name} (${user.workspaceName}) — configurações`}
                title={`${user.name} · ${user.workspaceName}`}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-night font-mono text-xs text-neon transition-transform hover:scale-105"
              >
                {initials(user.name)}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Sair"
                  title="Sair"
                  className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-night/10 bg-white/70 hover:bg-night hover:text-white"
                >
                  <LogOut size={15} aria-hidden />
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/entrar"
              className="flex min-h-10 shrink-0 items-center rounded-full bg-night px-4 text-xs font-medium text-white"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>

      <div id="top-panel-body" hidden={open ? undefined : true}>
        {open && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-9">
            {appNav.map((item, i) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[104px] flex-col justify-between rounded-2xl border p-4 transition-all hover:-translate-y-0.5 ${
                    active ? "border-night bg-night text-white" : item.destaque ? "border-night/10 bg-neon hover:bg-neon-claro" : "border-white/70 bg-white/55 hover:bg-white/90"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex size-9 items-center justify-center rounded-full ${
                        active ? "bg-neon text-night" : "bg-night/5"
                      }`}
                    >
                      <Icon size={17} aria-hidden />
                    </span>
                    <span className={`font-mono text-[10px] ${active ? "text-neon" : "opacity-40"}`}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div>
                    <p className="text-base font-medium leading-tight tracking-[-0.02em]">{item.label}</p>
                    <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.15em] opacity-50">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
