import Link from "next/link";
import { cookies } from "next/headers";
import SideNav from "@/components/app/SideNav";
import TopPanel from "@/components/app/TopPanel";
import CardFX from "@/components/motion/CardFX";
import AmbientDots from "@/components/motion/AmbientDots";
import { secondaryNav } from "@/components/app/nav";
import { Micro } from "@/components/app/ui";
import { site } from "@/content/site";
import { getUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  // teste do menu lateral: escolha guardada num cookie (MenuToggle)
  const lateral = (await cookies()).get("oraklo-menu")?.value === "lateral";
  const u = user && { name: user.name, workspaceName: user.workspaceName };
  return (
    <div className="tema-app app-canvas min-h-screen font-display text-night">
      <AmbientDots />
      {lateral && <SideNav user={u} />}
      <div className={`relative z-10 mx-auto max-w-[1440px] p-3 md:p-4 ${lateral ? "lg:ml-[272px] lg:mr-0 lg:max-w-[1360px]" : ""}`}>
        <div className={lateral ? "lg:hidden" : ""}>
          <TopPanel user={u} />
        </div>
        <main className="app-main pt-6 md:pt-8">{children}</main>
        <CardFX />
        <footer className="flex flex-wrap items-center justify-between gap-4 px-2 pb-4 pt-12">
          <Micro>
            © {new Date().getFullYear()} {site.name} · {site.email}
          </Micro>
          <nav aria-label="Mais páginas" className="flex flex-wrap gap-x-5 gap-y-2">
            {secondaryNav.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-55 hover:opacity-100"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </footer>
      </div>
    </div>
  );
}
