"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import type { Aviso } from "@/lib/avisos";

// Avisos de lead quente (sininho do topo): cotação pelo catálogo, produto visto, portfólio aberto
// pelo link pessoal e resposta de e-mail. O "lido até" fica por pessoa numa linha de `lists` do workspace.
// Server Actions são endpoints públicos: cada uma confere a sessão; o RLS isola o workspace.

const AVISOS_TAG = "__avisos_lidos__";
const TIPOS: Aviso["tipo"][] = ["cotacao_recebida", "produto_visto", "portfolio_viewed", "email_replied"];
const DIAS = 14;

export async function carregarAvisos(): Promise<{ itens: Aviso[]; naoLidos: number; lidoAte: string | null }> {
  const user = await requireUser();
  const db = await createClient();
  const desde = new Date(Date.now() - DIAS * 86_400_000).toISOString();
  const [{ data: eventos }, { data: lidos }] = await Promise.all([
    db
      .from("lead_events")
      .select("id, type, payload, created_at, lead_id, leads(name, company)")
      .in("type", TIPOS)
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(40),
    db.from("lists").select("filter").eq("tag", AVISOS_TAG).limit(1).maybeSingle(),
  ]);
  const lidoAte = ((lidos?.filter ?? {}) as Record<string, string>)[user.id] ?? null;
  const itens: Aviso[] = (eventos ?? []).map((e) => {
    const lead = (Array.isArray(e.leads) ? e.leads[0] : e.leads) as { name?: string; company?: string } | null;
    const p = (e.payload ?? {}) as { produto?: string; itens?: unknown[] };
    return {
      id: Number(e.id),
      tipo: e.type as Aviso["tipo"],
      leadId: e.lead_id as string,
      nome: lead?.name ?? "Lead",
      empresa: lead?.company ?? "",
      quando: e.created_at as string,
      produto: typeof p.produto === "string" ? p.produto : undefined,
      itens: Array.isArray(p.itens) ? p.itens.length : undefined,
    };
  });
  const naoLidos = itens.filter((a) => !lidoAte || a.quando > lidoAte).length;
  return { itens, naoLidos, lidoAte };
}

export async function marcarAvisosLidos(): Promise<void> {
  const user = await requireUser();
  const db = await createClient();
  const { data } = await db.from("lists").select("id, filter").eq("tag", AVISOS_TAG).limit(1).maybeSingle();
  const filtro = { ...((data?.filter ?? {}) as Record<string, string>), [user.id]: new Date().toISOString() };
  if (data) await db.from("lists").update({ filter: filtro }).eq("id", data.id);
  else await db.from("lists").insert({ workspace_id: user.workspaceId, tag: AVISOS_TAG, name: "Avisos lidos", filter: filtro });
}
