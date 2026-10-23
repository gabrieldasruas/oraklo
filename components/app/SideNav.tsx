"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { signOut } from "@/app/entrar/actions";
import { appNav, secondaryNav } from "@/components/app/nav";
import { Micro } from "@/components/app/ui";
import { site } from "@/content/site";
import MenuToggle from "./MenuToggle";
import TemaToggle from "./TemaToggle";
import AvisosSino from "./AvisosSino";

const iniciais = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

/** Menu lateral fixo (telas largas). Teste de navegação alternativa ao painel do topo. */
export default function SideNav({ user }: { user: { name: string; workspaceName: string } | null }) {
  const pathname = usePathname();
  const ativo = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside aria-label="Menu" className="glass fixed inset-y-3 left-3 z-30 hidden w-[256px] flex-col overflow-hidden p-4 lg:flex">
      <Link href="/" className="flex items-center gap-3 px-1" aria-label={`${site.name} — início`}>
        <span className="flex size-10 items-center justify-center rounded-xl bg-night">
          <span className="size-3 rounded-full bg-neon" />
        </span>
        <span className="text-xl font-semibold uppercase tracking-[-0.03em]">{site.name}</span>
      </Link>

      <Micro className="mt-7 px-2">Navegação</Micro>
      <nav className="mt-2 flex flex-col gap-1">
        {appNav.map((item) => {
          const on = ativo(item.href);
          const Icon = item.icon;
          if (item.destaque)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={on ? "page" : undefined}
                className={`group mt-2 flex items-center gap-3 rounded-2xl p-2.5 transition-all ${on ? "bg-night text-white" : "bg-neon text-night shadow-[0_12px_28px_-14px_color-mix(in_srgb,var(--color-neon-escuro)_95%,transparent)] hover:-translate-y-0.5"}`}
              >
                <span className={`flex size-9 items-center justify-center rounded-xl ${on ? "bg-neon text-night" : "bg-night text-neon"}`}>
                  <Icon size={17} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-tight">{item.label}</span>
                  <span className={`block truncate text-[11px] ${on ? "text-white/55" : "opacity-70"}`}>{item.desc}</span>
                </span>
              </Link>
            );
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-2xl p-2 transition-colors ${on ? "bg-night text-white" : "hover:bg-white/70"}`}
            >
              <span className={`flex size-9 items-center justify-center rounded-xl transition-colors ${on ? "bg-neon text-night" : "bg-night/5 group-hover:bg-night group-hover:text-neon"}`}>
                <Icon size={17} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-tight">{item.label}</span>
                <span className={`block truncate text-[11px] ${on ? "text-white/50" : "opacity-50"}`}>{item.desc}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex flex-wrap gap-x-3 gap-y-1 px-2">
        {secondaryNav
          .filter((l) => l.href !== "/configuracoes")
          .map((l) => (
            <Link key={l.href} href={l.href} className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-45 hover:opacity-100">
              {l.label}
            </Link>
          ))}
      </div>

      <div className="mt-auto space-y-3 pt-4">
        <div className="flex gap-2">
          <MenuToggle para="topo" className="flex-1 justify-center" />
          {user && <AvisosSino paraCima />}
          <TemaToggle />
        </div>
        {user ? (
          <div className="flex items-center gap-2.5 rounded-2xl bg-white/60 p-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-night font-mono text-xs text-neon">{iniciais(user.name)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-tight">{user.name}</span>
              <span className="block truncate text-[11px] opacity-55">{user.workspaceName}</span>
            </span>
            <Link href="/configuracoes" aria-label="Configurações" title="Configurações" className="flex size-8 items-center justify-center rounded-full hover:bg-night hover:text-white">
              <Settings size={14} aria-hidden />
            </Link>
            <form action={signOut}>
              <button type="submit" aria-label="Sair" title="Sair" className="flex size-8 cursor-pointer items-center justify-center rounded-full hover:bg-night hover:text-white">
                <LogOut size={14} aria-hidden />
              </button>
            </form>
          </div>
        ) : (
          <Link href="/entrar" className="flex min-h-10 items-center justify-center rounded-full bg-night text-xs font-medium text-white">
            Entrar
          </Link>
        )}
      </div>
    </aside>
  );
}
