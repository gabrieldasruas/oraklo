"use server";

import { after } from "next/server";
import { createAdminClient } from "@/lib/db/admin";
import { emailConfigurado, enviarLote, urlDoApp } from "@/lib/email";
import { PORTFOLIO_TAG } from "@/lib/portfolio-types";
import { PRODUTO_TAG, formatarPreco, type Produto } from "@/lib/produtos";

// Catálogo público: pedido de cotação e produto visto. Sem login (cliente admin), por isso
// tudo é conferido aqui: portfólio com link ligado, produtos do mesmo workspace, lead do mesmo workspace.
// Erros voltam como { ok: false, erro } (em produção o Next esconde a mensagem de exceções).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ITENS = 30;
const MAX_POR_10_MIN = 12; // pedidos de cotação por workspace a cada 10 minutos

const limpar = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Workspace dono do portfólio, se o link público estiver ligado. */
async function workspaceDoLink(portfolioId: string): Promise<string | null> {
  if (!UUID.test(portfolioId)) return null;
  const db = createAdminClient();
  const { data } = await db.from("lists").select("workspace_id, filter").eq("id", portfolioId).eq("tag", PORTFOLIO_TAG).maybeSingle();
  if (!data || !(data.filter as { compartilhar?: { ativo?: boolean } })?.compartilhar?.ativo) return null;
  return data.workspace_id as string;
}

async function leadDoWorkspace(leadId: string | null, ws: string) {
  if (!leadId || !UUID.test(leadId)) return null;
  const { data } = await createAdminClient().from("leads").select("id, status, score, company").eq("id", leadId).eq("workspace_id", ws).maybeSingle();
  return data;
}

export type PedidoCotacao = {
  portfolioId: string;
  leadId: string | null;
  itens: { produtoId: string; quantidade: number }[];
  contato: { nome: string; empresa: string; email: string; telefone: string; mensagem: string };
  aceite: boolean;
  /** campo escondido: robôs preenchem, pessoas não */
  site: string;
};

export async function pedirCotacao(p: PedidoCotacao): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (p.site) return { ok: true }; // robô: finge que deu certo
  const ws = await workspaceDoLink(p.portfolioId);
  if (!ws) return { ok: false, erro: "Este catálogo não está mais disponível." };

  const nome = limpar(p.contato?.nome, 80);
  const empresa = limpar(p.contato?.empresa, 80);
  const email = limpar(p.contato?.email, 120).toLowerCase();
  const telefone = limpar(p.contato?.telefone, 30);
  const mensagem = limpar(p.contato?.mensagem, 600);
  if (!nome || !empresa) return { ok: false, erro: "Preencha seu nome e o nome da empresa." };
  if (!EMAIL.test(email) && telefone.replace(/\D/g, "").length < 10) return { ok: false, erro: "Informe um e-mail ou um WhatsApp com DDD para receber a cotação." };
  if (email && !EMAIL.test(email)) return { ok: false, erro: "Esse e-mail não parece válido." };
  if (!p.aceite) return { ok: false, erro: "Marque que aceita ser contatado sobre a cotação." };

  const pedidos = (Array.isArray(p.itens) ? p.itens : []).filter((i) => UUID.test(String(i?.produtoId))).slice(0, MAX_ITENS);
  if (!pedidos.length) return { ok: false, erro: "Escolha pelo menos um produto." };

  const db = createAdminClient();
  // limite simples contra abuso
  const desde = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await db.from("lead_events").select("id", { count: "exact", head: true }).eq("workspace_id", ws).eq("type", "cotacao_recebida").gte("created_at", desde);
  if ((count ?? 0) >= MAX_POR_10_MIN) return { ok: false, erro: "Muitos pedidos agora. Tente de novo em alguns minutos." };

  const { data: linhas } = await db
    .from("lists")
    .select("id, filter")
    .eq("workspace_id", ws)
    .eq("tag", PRODUTO_TAG)
    .in("id", pedidos.map((i) => i.produtoId));
  const porId = new Map((linhas ?? []).map((r) => [r.id as string, r.filter as Produto]));
  const itens = pedidos.flatMap((i) => {
    const prod = porId.get(i.produtoId);
    if (!prod || prod.publico === false) return [];
    const quantidade = Math.max(1, Math.min(100_000, Math.round(Number(i.quantidade) || 1)));
    return [{ produto: prod.nome, quantidade, unidade: prod.unidade, preco: formatarPreco(prod) }];
  });
  if (!itens.length) return { ok: false, erro: "Os produtos escolhidos não estão mais no catálogo." };

  // veio pelo link pessoal de um lead → usa o lead; senão cria um novo, já quente
  const existente = await leadDoWorkspace(p.leadId, ws);
  let leadId = existente?.id as string | undefined;
  if (existente) {
    const status = existente.status === "Novo" || existente.status === "Em sequência" ? "Respondeu" : existente.status;
    await db.from("leads").update({ status, score: Math.max(Number(existente.score) || 0, 90), ...(email ? { email } : {}), ...(telefone ? { phone: telefone } : {}) }).eq("id", existente.id);
    if (status !== existente.status) await db.from("lead_events").insert({ lead_id: existente.id, workspace_id: ws, type: "status_changed", payload: { status, from: existente.status, motivo: "cotacao" } });
  } else {
    const { data: novo, error } = await db
      .from("leads")
      .insert({ workspace_id: ws, name: nome, role: "", company: empresa, email, phone: telefone, place: "", status: "Respondeu", score: 90 })
      .select("id")
      .single();
    if (error || !novo) return { ok: false, erro: "Não foi possível enviar o pedido. Tente de novo." };
    leadId = novo.id as string;
    await db.from("lead_events").insert({ lead_id: leadId, workspace_id: ws, type: "created", payload: { from: "catalogo" } });
  }

  await db.from("lead_events").insert({
    lead_id: leadId,
    workspace_id: ws,
    type: "cotacao_recebida",
    payload: { itens, mensagem, contato: { nome, empresa, email, telefone } },
    created_by: null,
  });

  // avisa o dono por e-mail sem atrasar a resposta para o comprador
  after(async () => {
    if (!emailConfigurado()) return;
    const { data: admins } = await db.from("members").select("user_id").eq("workspace_id", ws).eq("role", "admin").limit(1);
    const userId = admins?.[0]?.user_id as string | undefined;
    if (!userId) return;
    const { data: u } = await db.auth.admin.getUserById(userId);
    const para = u?.user?.email;
    if (!para) return;
    const lista = itens.map((i) => `• ${i.quantidade} ${i.unidade || "un"} — ${i.produto} (${i.preco})`).join("\n");
    const texto = `${nome}, da ${empresa}, pediu uma cotação pelo seu catálogo:\n\n${lista}${mensagem ? `\n\nMensagem: ${mensagem}` : ""}\n\nContato: ${[email, telefone].filter(Boolean).join(" · ")}\n\nO pedido já está no seu pipeline, em "Respondeu": ${urlDoApp()}/leads`;
    await enviarLote([{ para, assunto: `Nova cotação: ${empresa}`, texto, responderPara: email || undefined }]).catch(() => {});
  });

  return { ok: true };
}

/** Lead que veio pelo link pessoal abriu um produto do catálogo (uma vez a cada 6 h por produto). */
export async function registrarProdutoVisto(portfolioId: string, leadId: string | null, produtoId: string): Promise<void> {
  if (!leadId || !UUID.test(produtoId)) return;
  const ws = await workspaceDoLink(portfolioId);
  if (!ws) return;
  const lead = await leadDoWorkspace(leadId, ws);
  if (!lead) return;
  const db = createAdminClient();
  const { data: prod } = await db.from("lists").select("filter").eq("id", produtoId).eq("workspace_id", ws).eq("tag", PRODUTO_TAG).maybeSingle();
  if (!prod) return;
  const nome = (prod.filter as Produto).nome;
  const desde = new Date(Date.now() - 6 * 3_600_000).toISOString();
  const { data: recente } = await db.from("lead_events").select("id").eq("lead_id", lead.id).eq("type", "produto_visto").eq("payload->>produtoId", produtoId).gte("created_at", desde).limit(1);
  if (recente?.length) return;
  await db.from("lead_events").insert({ lead_id: lead.id, workspace_id: ws, type: "produto_visto", payload: { produtoId, produto: nome }, created_by: null });
}
