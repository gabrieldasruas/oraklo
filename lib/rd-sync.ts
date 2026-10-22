import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./db/admin";
import { CONFIG_TAG, RD_TOKEN_TAG, completarConfig, type ConfigRd, type ConfigWorkspace } from "./config-workspace";
import { decifrar } from "./segredo";
import { ErroRd, anotar, criarEmpresa, criarNegociacao, moverNegociacao } from "./rdstation";

// Sincronização Oraklo → RD Station CRM. Cada lead vira empresa + negociação + contato no RD;
// o vínculo fica num evento `rd_synced` do lead (lead_events só aceita inserir).

export type EventoRd = "lead.criado" | "lead.etapa" | "lead.respondeu" | "reuniao.marcada" | "nota";

type LeadRow = { id: string; workspace_id: string; name: string; role: string; company: string; email: string; phone: string; place: string; status: string; cnpj: string | null };
const COLS = "id, workspace_id, name, role, company, email, phone, place, status, cnpj";

/** Configuração + token decifrado do workspace (com a sessão do usuário). */
export async function contextoRd(db: SupabaseClient): Promise<{ cfg: ConfigRd; token: string } | null> {
  const [{ data: cfgRow }, { data: tok }] = await Promise.all([
    db.from("lists").select("filter").eq("tag", CONFIG_TAG).limit(1).maybeSingle(),
    db.from("lists").select("filter").eq("tag", RD_TOKEN_TAG).limit(1).maybeSingle(),
  ]);
  const cfg = completarConfig(cfgRow?.filter as Partial<ConfigWorkspace> | null).rd;
  const cifrado = (tok?.filter as { cifrado?: string } | null)?.cifrado;
  const token = cifrado ? decifrar(cifrado) : null;
  if (!cfg.conectado || !token) return null;
  return { cfg, token };
}

/** id da negociação no RD de cada lead já sincronizado. */
async function vinculos(db: SupabaseClient, leadIds: string[]) {
  const { data } = await db.from("lead_events").select("lead_id, payload").eq("type", "rd_synced").in("lead_id", leadIds);
  return new Map((data ?? []).map((e) => [e.lead_id as string, String((e.payload as { dealId?: string })?.dealId ?? "")]));
}

async function registrar(lead: LeadRow, type: "rd_synced" | "rd_sync_failed", payload: Record<string, unknown>) {
  await createAdminClient().from("lead_events").insert({ lead_id: lead.id, workspace_id: lead.workspace_id, type, payload, created_by: null });
}

/** Cria a negociação do lead no RD (empresa + contato), na etapa mapeada. */
async function criarNoRd(token: string, cfg: ConfigRd, lead: LeadRow): Promise<string> {
  const empresaId = await criarEmpresa(token, {
    nome: lead.company,
    resumo: [lead.place, lead.cnpj ? `CNPJ ${String(lead.cnpj).trim()}` : null, "Enviado pelo Oraklo"].filter(Boolean).join(" · "),
  });
  const dealId = await criarNegociacao(token, {
    nome: lead.company,
    etapaId: cfg.etapas[lead.status] || undefined,
    empresaId: empresaId || undefined,
    contato: { nome: lead.name, cargo: lead.role || undefined, email: lead.email || undefined, telefone: lead.phone || undefined },
  });
  await registrar(lead, "rd_synced", { dealId, empresaId });
  return dealId;
}

async function processar(token: string, cfg: ConfigRd, lead: LeadRow, dealId: string | undefined, evento: EventoRd, texto?: string) {
  try {
    if (!dealId) {
      if (evento === "lead.criado" && !cfg.enviarNovos) return;
      if (evento === "nota") return; // nota de lead que ainda não está no RD: não cria negociação
      await criarNoRd(token, cfg, lead);
      return;
    }
    if ((evento === "lead.etapa" || evento === "lead.respondeu") && cfg.sincronizarEtapas && cfg.etapas[lead.status]) {
      await moverNegociacao(token, dealId, cfg.etapas[lead.status]);
    }
    if ((evento === "reuniao.marcada" || evento === "nota") && cfg.anotacoes && texto) {
      await anotar(token, dealId, texto);
    }
  } catch (e) {
    await registrar(lead, "rd_sync_failed", { erro: e instanceof ErroRd ? e.message : "Falha ao sincronizar com o RD Station", evento });
  }
}

/** Agenda a sincronização depois da resposta (não atrasa a tela). */
export async function agendarRd(db: SupabaseClient, evento: EventoRd, leadIds: string[], texto?: string) {
  if (!leadIds.length) return;
  const ctx = await contextoRd(db);
  if (!ctx) return;
  const [{ data: leads }, mapa] = await Promise.all([db.from("leads").select(COLS).in("id", leadIds.slice(0, 50)), vinculos(db, leadIds)]);
  after(async () => {
    for (const l of (leads ?? []) as LeadRow[]) await processar(ctx.token, ctx.cfg, l, mapa.get(l.id) || undefined, evento, texto);
  });
}

/** Envia agora (botão "Enviar ao RD"): cria quem ainda não está lá. Sequencial por causa do limite da API. */
export async function enviarAgora(db: SupabaseClient, leadIds: string[]): Promise<{ enviados: number; jaEstavam: number; falharam: number; erro: string | null }> {
  const ctx = await contextoRd(db);
  if (!ctx) return { enviados: 0, jaEstavam: 0, falharam: 0, erro: "Conecte o RD Station em Configurações." };
  const [{ data: leads }, mapa] = await Promise.all([db.from("leads").select(COLS).in("id", leadIds.slice(0, 50)), vinculos(db, leadIds)]);
  let enviados = 0;
  let falharam = 0;
  let jaEstavam = 0;
  let erro: string | null = null;
  for (const l of (leads ?? []) as LeadRow[]) {
    if (mapa.get(l.id)) {
      jaEstavam++;
      continue;
    }
    try {
      await criarNoRd(ctx.token, ctx.cfg, l);
      enviados++;
    } catch (e) {
      falharam++;
      erro = e instanceof ErroRd ? e.message : "Falha ao enviar ao RD Station";
      await registrar(l, "rd_sync_failed", { erro, evento: "manual" });
      if (e instanceof ErroRd && (e.status === 401 || e.status === 403 || e.status === 429)) break;
    }
  }
  return { enviados, jaEstavam, falharam, erro };
}
