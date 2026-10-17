"use client";

import { useMemo, useState } from "react";
import { Search, Trash2, Mail, Phone } from "lucide-react";
import { STATUSES, useLeads, type Status } from "@/lib/leads";
import PageHeader from "@/components/app/PageHeader";
import LeadForm from "@/components/app/LeadForm";
import { Aura, Glass, Micro, Pill, WireArt } from "@/components/app/ui";

const statusDot: Record<string, string> = {
  Novo: "bg-night/30",
  "Em sequência": "bg-sky-500",
  Respondeu: "bg-amber-400",
  "Reunião marcada": "bg-neon ring-1 ring-night",
  "Sem interesse": "bg-rose-400",
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

export default function LeadsView() {
  const { leads, loaded, error, addLead, removeLead, updateStatus } = useLeads();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.role, l.company, l.place, l.email].some((v) => v.toLowerCase().includes(q)),
    );
  }, [leads, query]);

  const kpis = [
    { label: "Leads na lista", value: leads.length, tone: "night" as const },
    { label: "Contatados", value: leads.filter((l) => l.status !== "Novo").length, tone: "lime" as const },
    {
      label: "Respostas",
      value: leads.filter((l) => l.status === "Respondeu" || l.status === "Reunião marcada").length,
      tone: "sun" as const,
    },
    { label: "Reuniões", value: leads.filter((l) => l.status === "Reunião marcada").length, tone: "mint" as const },
  ];

  function onDelete(id: string, name: string) {
    if (window.confirm(`Excluir o lead "${name}"?`)) removeLead(id);
  }

  return (
    <>
      <PageHeader
        index="02"
        title="Leads"
        description="Cadastre e acompanhe seus contatos. Os leads ficam salvos no workspace da sua equipe."
        action={<Pill onClick={() => setFormOpen(true)}>Novo lead</Pill>}
      />

      <div className="space-y-4">
        {error && (
          <p role="alert" className="rounded-2xl bg-rose-100 px-5 py-3 text-sm text-rose-900">
            {error}
          </p>
        )}
        <section aria-label="Resumo" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((k, i) => (
            <Aura key={k.label} tone={k.tone} className="relative min-h-[140px] p-5">
              <WireArt
                kind={(["rings", "waves", "fan", "orbit"] as const)[i]}
                className={`absolute -bottom-6 -right-6 size-32 opacity-25 ${k.tone === "night" ? "text-neon" : "text-night"}`}
              />
              <Micro className="relative !opacity-70">{k.label}</Micro>
              <p className="relative mt-5 text-6xl font-light leading-none tracking-[-0.05em] tabular-nums">
                {loaded ? k.value.toLocaleString("pt-BR") : "–"}
              </p>
            </Aura>
          ))}
        </section>

        <Glass className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-night/10 p-4">
            <label className="relative block w-full sm:max-w-sm">
              <span className="sr-only">Buscar leads</span>
              <Search size={16} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, cargo ou empresa"
                className="min-h-12 w-full rounded-full border border-night/10 bg-white/70 pl-11 pr-4 text-sm"
              />
            </label>
            <Micro>{loaded ? `${filtered.length} de ${leads.length} leads` : "Carregando…"}</Micro>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <caption className="sr-only">Lista de leads</caption>
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
                  <th scope="col" className="px-6 py-4 font-normal">Contato</th>
                  <th scope="col" className="px-4 py-4 font-normal">Empresa</th>
                  <th scope="col" className="px-4 py-4 font-normal">Localização</th>
                  <th scope="col" className="px-4 py-4 font-normal">Status</th>
                  <th scope="col" className="px-4 py-4 font-normal">Score</th>
                  <th scope="col" className="px-4 py-4 font-normal">Cadastro</th>
                  <th scope="col" className="px-4 py-4"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-night/10 border-t border-night/10">
                {filtered.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-white/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-night font-mono text-xs text-neon">
                          {initials(l.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium tracking-[-0.01em]">{l.name}</span>
                          <span className="block text-xs opacity-55">{l.role || "—"}</span>
                          {(l.email || l.phone) && (
                            <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs opacity-55">
                              {l.email && (
                                <span className="flex items-center gap-1">
                                  <Mail size={11} aria-hidden /> {l.email}
                                </span>
                              )}
                              {l.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={11} aria-hidden /> {l.phone}
                                </span>
                              )}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{l.company}</td>
                    <td className="px-4 py-4 opacity-60">{l.place || "—"}</td>
                    <td className="px-4 py-4">
                      <label className="relative inline-flex items-center">
                        <span className="sr-only">Status de {l.name}</span>
                        <span
                          aria-hidden
                          className={`pointer-events-none absolute left-3 size-2 rounded-full ${statusDot[l.status]}`}
                        />
                        <select
                          value={l.status}
                          onChange={(e) => updateStatus(l.id, e.target.value as Status)}
                          className="min-h-9 cursor-pointer appearance-none rounded-full border border-night/10 bg-white/70 py-1.5 pl-7 pr-4 text-xs hover:bg-white"
                        >
                          {STATUSES.map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="relative h-px w-20 bg-night/15">
                          <span className="absolute inset-y-0 left-0 h-[3px] -translate-y-px bg-night" style={{ width: `${l.score}%` }} />
                        </span>
                        <span className="w-7 font-mono text-xs tabular-nums">{l.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs opacity-55">
                      {new Date(l.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDelete(l.id, l.name)}
                        aria-label={`Excluir ${l.name}`}
                        className="inline-flex size-10 cursor-pointer items-center justify-center rounded-full opacity-50 hover:bg-night hover:text-white hover:opacity-100"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loaded && filtered.length === 0 && (
            <p className="px-5 py-14 text-center text-sm opacity-60">
              {leads.length === 0
                ? "Nenhum lead cadastrado ainda. Clique em “Novo lead” ou adicione uma empresa a partir da busca."
                : "Nenhum lead encontrado para essa busca."}
            </p>
          )}
        </Glass>
      </div>

      <LeadForm open={formOpen} onClose={() => setFormOpen(false)} onSave={addLead} />
    </>
  );
}
