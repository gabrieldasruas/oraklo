import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CONFIG_TAG, completarConfig, webhookPermitido, type ConfigWorkspace, type EventoCrm } from "./config-workspace";

// Integração com CRM por webhook: a cada evento escolhido, o Oraklo manda um POST JSON para a URL
// configurada (Zapier, Make, n8n, RD Station, Pipedrive, HubSpot via automação…).

export type LeadWebhook = {
  id: string;
  nome: string;
  cargo: string;
  empresa: string;
  email: string;
  telefone: string;
  cidade: string;
  etapa: string;
  score: number;
  cnpj: string | null;
};

/** POST com tempo limite. Não lança erro: devolve se deu certo. */
export async function enviarWebhook(url: string, corpo: Record<string, unknown>): Promise<{ ok: boolean; status: number | null }> {
  if (!webhookPermitido(url)) return { ok: false, status: null };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Oraklo-Webhook/1.0", "X-Oraklo-Evento": String(corpo.evento ?? "") },
      body: JSON.stringify(corpo),
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: null };
  }
}

/**
 * Agenda o envio de um evento para o CRM do workspace (depois da resposta, sem atrasar a tela).
 * Lê a configuração e os leads agora, com a sessão do usuário; o POST roda em `after`.
 */
export async function avisarCrm(db: SupabaseClient, workspace: string, evento: EventoCrm, leadIds: string[], extra: Record<string, unknown> = {}) {
  if (!leadIds.length) return;
  const { data: cfgRow } = await db.from("lists").select("filter").eq("tag", CONFIG_TAG).limit(1).maybeSingle();
  const cfg: ConfigWorkspace = completarConfig(cfgRow?.filter as Partial<ConfigWorkspace> | null);
  if (!cfg.crm.ativo || !cfg.crm.webhookUrl || !cfg.crm.eventos.includes(evento)) return;
  const { data: leads } = await db.from("leads").select("id, name, role, company, email, phone, place, status, score, cnpj").in("id", leadIds.slice(0, 100));
  const url = cfg.crm.webhookUrl;
  after(async () => {
    for (const l of leads ?? []) {
      const lead: LeadWebhook = {
        id: l.id,
        nome: l.name,
        cargo: l.role,
        empresa: l.company,
        email: l.email,
        telefone: l.phone,
        cidade: l.place,
        etapa: l.status,
        score: l.score,
        cnpj: l.cnpj ? String(l.cnpj).trim() : null,
      };
      await enviarWebhook(url, { evento, workspace, enviadoEm: new Date().toISOString(), lead, ...extra });
    }
  });
}
