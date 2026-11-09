"use server";

import { redirect } from "next/navigation";
import { site } from "@/content/site";
import { createAdminClient } from "@/lib/db/admin";
import { assinarPedido, pedidoValido } from "@/lib/descadastro";
import { emailConfigurado, enviarLote, urlDoApp } from "@/lib/email";
import { formatCnpj } from "@/lib/format";
import { chave, gravar, hashEmail, normalizarEmail, type Item, type Tipo } from "@/lib/supressao";

// Página pública de remoção (LGPD). Qualquer pessoa pede; o pedido só vale depois que o dono do
// e-mail informado confirma pelo link. O e-mail e o nome do sócio ficam só como hash.

export type Estado = { ok?: true; erro?: string } | null;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALIDADE_MS = 48 * 3600_000;
const POR_EMAIL_DIA = 5;
const TOTAL_DIA = 500;

export async function pedirRemocao(_: Estado, form: FormData): Promise<Estado> {
  if (String(form.get("site") ?? "")) return { ok: true }; // campo escondido: só robô preenche
  const tipo = String(form.get("tipo") ?? "email") as Tipo;
  const email = normalizarEmail(String(form.get("email") ?? "")).slice(0, 120);
  if (!EMAIL.test(email)) return { erro: "Informe um e-mail válido. É para ele que mandamos o link de confirmação." };

  const cnpj = String(form.get("cnpj") ?? "").replace(/\D/g, "");
  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
  let item: Item;
  if (tipo === "email") item = { email };
  else if (cnpj.length !== 14) return { erro: "Informe o CNPJ com os 14 números." };
  else if (tipo === "cnpj") item = { cnpj };
  else if (tipo === "socio" && nome.split(" ").length >= 2) item = { socio: { cnpj, nome } };
  else return { erro: "Informe o nome completo, como está no cadastro da empresa na Receita." };

  if (!emailConfigurado()) return { erro: `Não conseguimos enviar a confirmação agora. Escreva para ${site.email} que fazemos a remoção.` };

  const db = createAdminClient();
  const quem = hashEmail(email);
  const desde = new Date(Date.now() - 86_400_000).toISOString();
  const [meus, todos] = await Promise.all([
    db.from("suppression_requests").select("id", { count: "exact", head: true }).eq("requester_hash", quem).gte("created_at", desde),
    db.from("suppression_requests").select("id", { count: "exact", head: true }).gte("created_at", desde),
  ]);
  if ((meus.count ?? 0) >= POR_EMAIL_DIA) return { erro: "Você já fez vários pedidos hoje. Confira sua caixa de entrada (e o spam) ou tente amanhã." };
  if ((todos.count ?? 0) >= TOTAL_DIA) return { erro: `Recebemos muitos pedidos agora. Escreva para ${site.email} que fazemos a remoção.` };

  const { data, error } = await db.from("suppression_requests").insert({ requester_hash: quem, ...chave(item) }).select("id").single();
  if (error || !data) return { erro: "Não foi possível registrar o pedido. Tente de novo." };

  const link = `${urlDoApp()}/remover-dados/confirmar?p=${data.id}&t=${assinarPedido(data.id as string)}`;
  const oque = tipo === "email" ? "o seu e-mail" : tipo === "cnpj" ? `a empresa de CNPJ ${formatCnpj(cnpj)}` : `o nome ${nome}, sócio da empresa de CNPJ ${formatCnpj(cnpj)}`;
  const [enviado] = await enviarLote([
    {
      para: email,
      assunto: `Confirme a remoção dos seus dados do ${site.name}`,
      texto: `Olá,\n\nRecebemos um pedido para remover ${oque} da base do ${site.name}. Depois da confirmação, nenhum cliente do ${site.name} poderá usar esse dado para contato.\n\nPara confirmar, abra o link abaixo (vale por 48 horas):\n${link}\n\nSe você não fez esse pedido, ignore este e-mail.\n\n${site.name} · ${site.email}`,
    },
  ]);
  if (!enviado) return { erro: `Não conseguimos enviar o e-mail de confirmação. Escreva para ${site.email} que fazemos a remoção.` };
  return { ok: true };
}

/** Confirma o pedido (botão da página do link). Grava na lista global e registra quando foi atendido. */
export async function confirmarRemocao(form: FormData) {
  const p = String(form.get("p") ?? "");
  const t = String(form.get("t") ?? "");
  if (!UUID.test(p) || !pedidoValido(p, t)) redirect("/remover-dados/confirmar?erro=1");
  const db = createAdminClient();
  const { data: pedido } = await db.from("suppression_requests").select("id, kind, value, created_at, confirmed_at").eq("id", p).maybeSingle();
  if (!pedido) redirect("/remover-dados/confirmar?erro=1");
  if (!pedido.confirmed_at) {
    if (Date.now() - new Date(pedido.created_at as string).getTime() > VALIDADE_MS) redirect("/remover-dados/confirmar?expirou=1");
    await gravar([{ kind: pedido.kind as Tipo, value: pedido.value as string }], "pedido_publico", { pedido_id: pedido.id, via: "página /remover-dados" });
    await db.from("suppression_requests").update({ confirmed_at: new Date().toISOString() }).eq("id", p);
  }
  redirect("/remover-dados/confirmar?ok=1");
}
