"use server";

import { createAdminClient } from "@/lib/db/admin";
import { PORTFOLIO_TAG, VISITAS_TAG } from "@/lib/portfolio-types";

// Visita ao portfólio público. Chamada do navegador (não conta robôs que só baixam o HTML).
// Sem login: usa o cliente admin, mas só grava depois de conferir portfólio e lead.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function registrarVisita(portfolioId: string, leadId: string | null): Promise<void> {
  if (!UUID.test(portfolioId)) return;
  const db = createAdminClient();
  const { data: port } = await db.from("lists").select("workspace_id, filter").eq("id", portfolioId).eq("tag", PORTFOLIO_TAG).maybeSingle();
  if (!port || !(port.filter as { compartilhar?: { ativo?: boolean } })?.compartilhar?.ativo) return;
  const ws = port.workspace_id as string;

  // contador do workspace
  const dia = new Date().toISOString().slice(0, 10);
  const { data: cont } = await db.from("lists").select("id, filter").eq("workspace_id", ws).eq("tag", VISITAS_TAG).limit(1).maybeSingle();
  const f = (cont?.filter ?? {}) as { total?: number; porDia?: Record<string, number> };
  const porDia = { ...(f.porDia ?? {}), [dia]: (f.porDia?.[dia] ?? 0) + 1 };
  // guarda só os últimos 90 dias
  for (const d of Object.keys(porDia).sort().slice(0, -90)) delete porDia[d];
  const novo = { total: (f.total ?? 0) + 1, porDia, ultima: new Date().toISOString() };
  if (cont) await db.from("lists").update({ filter: novo }).eq("id", cont.id);
  else await db.from("lists").insert({ workspace_id: ws, tag: VISITAS_TAG, name: "Visitas do portfólio", filter: novo, owner_id: null });

  // veio pelo link do e-mail → entra no histórico do lead (uma vez a cada 6 h)
  if (leadId && UUID.test(leadId)) {
    const { data: lead } = await db.from("leads").select("id").eq("id", leadId).eq("workspace_id", ws).maybeSingle();
    if (!lead) return;
    const desde = new Date(Date.now() - 6 * 3_600_000).toISOString();
    const { data: recente } = await db.from("lead_events").select("id").eq("lead_id", leadId).eq("type", "portfolio_viewed").gte("created_at", desde).limit(1);
    if (!recente?.length) await db.from("lead_events").insert({ lead_id: leadId, workspace_id: ws, type: "portfolio_viewed", payload: {}, created_by: null });
  }
}
