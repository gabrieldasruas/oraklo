import Link from "next/link";
import TopPanel from "@/components/app/TopPanel";
import { secondaryNav } from "@/components/app/nav";
import { Micro } from "@/components/app/ui";
import { site } from "@/content/site";
import { getUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <div className="app-canvas min-h-screen font-display text-night">
      <div className="relative z-10 mx-auto max-w-[1440px] p-3 md:p-4">
        <TopPanel user={user && { name: user.name, workspaceName: user.workspaceName }} />
        <main className="pt-6 md:pt-8">{children}</main>
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
