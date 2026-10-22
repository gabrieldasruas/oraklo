"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { sitePeloEmail } from "@/lib/crm";
import { LIMITES, planoDoWorkspace } from "@/lib/planos";

// Enriquecimento de decisores pelo Hunter (https://hunter.io): pessoas e e-mails do domínio da empresa.
// Desligado até existir HUNTER_API_KEY nas variáveis da Vercel.

export type Pessoa = { nome: string; cargo: string; email: string; confianca: number; linkedin: string | null; senioridade: string | null };

export async function hunterConfigurado(): Promise<{ configurado: boolean; liberado: boolean }> {
  const user = await requireUser();
  const liberado = LIMITES[await planoDoWorkspace(await createClient(), user.workspaceId)].decisores;
  return { configurado: Boolean(process.env.HUNTER_API_KEY), liberado };
}

const limparDominio = (d: string) =>
  d
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];

/** Domínio provável do lead (pelo e-mail dele). */
export async function dominioDoLead(leadId: string): Promise<string | null> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("leads").select("email").eq("id", leadId).maybeSingle();
  return sitePeloEmail((data?.email as string) || null);
}

export async function buscarDecisores(dominio: string): Promise<{ dominio: string; pessoas: Pessoa[]; organizacao: string | null }> {
  const user = await requireUser();
  if (!LIMITES[await planoDoWorkspace(await createClient(), user.workspaceId)].decisores) throw new Error("Decisores fazem parte do Premium.");
  const chave = process.env.HUNTER_API_KEY;
  if (!chave) throw new Error("Configure HUNTER_API_KEY para buscar decisores.");
  const d = limparDominio(dominio);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) throw new Error("Domínio inválido (ex.: empresa.com.br)");

  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(d)}&limit=10&api_key=${chave}`;
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 429) throw new Error("Limite do Hunter atingido. Tente mais tarde.");
  if (!res.ok) throw new Error("Não foi possível consultar o Hunter");
  const json = (await res.json()) as {
    data?: {
      organization?: string | null;
      emails?: { value: string; first_name: string | null; last_name: string | null; position: string | null; confidence: number; linkedin: string | null; seniority: string | null }[];
    };
  };
  const ordem: Record<string, number> = { executive: 0, senior: 1 };
  const pessoas = (json.data?.emails ?? [])
    .map((e) => ({
      nome: [e.first_name, e.last_name].filter(Boolean).join(" ") || e.value.split("@")[0],
      cargo: e.position ?? "",
      email: e.value,
      confianca: e.confidence,
      linkedin: e.linkedin,
      senioridade: e.seniority,
    }))
    .sort((a, b) => (ordem[a.senioridade ?? ""] ?? 2) - (ordem[b.senioridade ?? ""] ?? 2) || b.confianca - a.confianca);
  return { dominio: d, pessoas, organizacao: json.data?.organization ?? null };
}

/** Usa a pessoa encontrada como contato principal do lead. */
export async function usarContato(leadId: string, p: Pick<Pessoa, "nome" | "cargo" | "email">): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ name: p.nome.slice(0, 80), role: p.cargo.slice(0, 80), email: p.email.slice(0, 120) })
    .eq("id", leadId);
  if (error) throw new Error("Não foi possível atualizar o lead");
  await supabase.from("lead_events").insert({ lead_id: leadId, workspace_id: user.workspaceId, type: "enriched", payload: { name: p.nome, email: p.email, source: "hunter" } });
}
