import type { Metadata } from "next";
import { site } from "@/content/site";
import { settings } from "@/content/app";
import PageHeader from "@/components/app/PageHeader";
import { Glass, Micro } from "@/components/app/ui";

export const metadata: Metadata = { title: `Configurações — ${site.name}` };

// Interruptor apenas visual.
function Toggle({ on }: { on: boolean }) {
  return (
    <span
      role="img"
      aria-label={on ? "Ativado" : "Desativado"}
      className={`flex h-7 w-12 shrink-0 items-center rounded-full p-1 ${on ? "bg-night" : "bg-night/15"}`}
    >
      <span className={`size-5 rounded-full ${on ? "translate-x-5 bg-neon" : "bg-white"}`} />
    </span>
  );
}

const input =
  "mt-2 min-h-12 w-full rounded-2xl border border-night/10 bg-white/70 px-4 text-sm";

export default function ConfiguracoesPage() {
  return (
    <>
      <PageHeader
        index="07"
        title="Configurações"
        description="Gerencie seu perfil, equipe, integrações e notificações."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Glass className="p-7">
          <Micro>01 · {settings.sections[0]}</Micro>
          <div className="mt-5 space-y-4">
            <label className="block text-sm font-medium">
              Nome
              <input className={input} defaultValue="Gabriel Senhas" readOnly />
            </label>
            <label className="block text-sm font-medium">
              E-mail
              <input className={input} defaultValue="gabriel@prospecta.app" readOnly />
            </label>
            <label className="block text-sm font-medium">
              Empresa
              <input className={input} defaultValue="Minha Empresa" readOnly />
            </label>
          </div>
        </Glass>

        <Glass className="p-7">
          <Micro>02 · {settings.sections[1]}</Micro>
          <ul className="mt-5 divide-y divide-night/10">
            {settings.team.map((m) => (
              <li key={m.email} className="flex items-center gap-4 py-4">
                <span className="flex size-11 items-center justify-center rounded-full bg-night font-mono text-xs text-neon">
                  {m.name.split(" ").map((n) => n[0]).join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{m.name}</span>
                  <span className="block truncate text-xs opacity-55">{m.email}</span>
                </span>
                <Micro>{m.role}</Micro>
              </li>
            ))}
          </ul>
        </Glass>

        <Glass className="p-7">
          <Micro>03 · {settings.sections[2]}</Micro>
          <ul className="mt-5 divide-y divide-night/10">
            {settings.integrations.map((i) => (
              <li key={i.name} className="flex items-center justify-between gap-4 py-4">
                <span>
                  <span className="block font-medium">{i.name}</span>
                  <span className="block text-xs opacity-55">{i.text}</span>
                </span>
                <Toggle on={i.on} />
              </li>
            ))}
          </ul>
        </Glass>

        <Glass className="p-7">
          <Micro>04 · {settings.sections[3]}</Micro>
          <ul className="mt-5 divide-y divide-night/10">
            {settings.notifications.map((n) => (
              <li key={n.label} className="flex items-center justify-between gap-4 py-4 text-sm">
                {n.label}
                <Toggle on={n.on} />
              </li>
            ))}
          </ul>
        </Glass>
      </div>
    </>
  );
}
