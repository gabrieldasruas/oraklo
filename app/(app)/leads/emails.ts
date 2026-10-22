"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { emailConfigurado, enviarLote, urlDoApp } from "@/lib/email";
import { rodapeDescadastro } from "@/lib/descadastro";
import { avisarCrm } from "@/lib/crm-webhook";
import { carregarConfig } from "../configuracoes/actions";
import { PORTFOLIO_TAG, completar, preencherEmail, type Portfolio } from "@/lib/portfolio-types";

// Disparo de e-mails para leads (Resend) com follow-up automático.
// Cada envio vira um evento `email_sent`; o follow-up é enviado pelo cron (/api/cron/followups)
// se o lead não responder até a data marcada. Aberturas e cliques chegam pelo webhook da Resend.

const MAX_POR_ENVIO = 200;
const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export type ConfigEmail = { configurado: boolean; remetente: string | null };

export async function configuracaoEmail(): Promise<ConfigEmail> {
  await requireUser();
  return { configurado: emailConfigurado(), remetente: emailConfigurado() ? (process.env.EMAIL_FROM ?? null) : null };
}

export type Disparo = {
  leadIds: string[];
  assunto: string;
  corpo: string;
  followup?: { dias: number; assunto: string; corpo: string } | null;
};

/** Link do portfólio público com o lead marcado (para registrar a visita no histórico). */
function linkPortfolio(portfolioId: string | null, p: Portfolio, leadId: string) {
  if (!portfolioId || !p.compartilhar?.ativo) return "";
  return `${urlDoApp()}/p/${portfolioId}?l=${leadId}`;
}

export async function enviarEmails(d: Disparo): Promise<{ enviados: number; semEmail: number; falharam: number }> {
  const user = await requireUser();
  if (!emailConfigurado()) throw new Error("Configure o envio de e-mail (RESEND_API_KEY e EMAIL_FROM) para disparar.");
  const assunto = texto(d.assunto, 200);
  const corpo = texto(d.corpo, 8000);
  if (!assunto || !corpo) throw new Error("Preencha o assunto e a mensagem");
  const ids = [...new Set(d.leadIds)].slice(0, MAX_POR_ENVIO);
  if (!ids.length) throw new Error("Escolha ao menos um lead");

  const supabase = await createClient();
  const [{ data: leads, error }, { data: port }] = await Promise.all([
    supabase.from("leads").select("id, name, company, email, status").in("id", ids),
    supabase.from("lists").select("id, filter").eq("tag", PORTFOLIO_TAG).order("created_at").limit(1).maybeSingle(),
  ]);
  if (error) throw new Error("Não foi possível carregar os leads");
  const p = completar(port?.filter as Partial<Portfolio> | null);
  const portfolioId = (port?.id as string | undefined) ?? null;

  // quem pediu para sair da lista não recebe mais nada
  const { data: saiu } = await supabase.from("lead_events").select("lead_id").eq("type", "email_unsubscribed").in("lead_id", ids);
  const descadastrados = new Set((saiu ?? []).map((e) => e.lead_id as string));
  const comEmail = (leads ?? []).filter((l) => emailValido(String(l.email).trim()) && !descadastrados.has(l.id));
  const semEmail = (leads?.length ?? 0) - comEmail.length;
  const dias = d.followup ? Math.min(30, Math.max(1, Math.round(d.followup.dias))) : 0;
  const followAt = d.followup ? new Date(Date.now() + dias * 86_400_000).toISOString() : null;

  const preencher = (t: string, l: { id: string; name: string; company: string }) =>
    preencherEmail(t.replaceAll("{link_portfolio}", linkPortfolio(portfolioId, p, l.id)), p, l);

  const assinatura = (await carregarConfig().catch(() => null))?.assinatura?.trim();
  const comAssinatura = (t: string) => (assinatura ? `${t}\n\n${assinatura}` : t);

  const msgs = comEmail.map((l) => ({
    para: String(l.email).trim(),
    assunto: preencher(assunto, l),
    texto: comAssinatura(preencher(corpo, l)) + rodapeDescadastro(l.id),
    responderPara: user.email || undefined,
    tags: { lead: l.id },
  }));
  const resultado = await enviarLote(msgs);

  const eventos = [];
  const paraSequencia: string[] = [];
  let enviados = 0;
  for (let i = 0; i < comEmail.length; i++) {
    const id = resultado[i];
    if (!id) continue;
    enviados++;
    const l = comEmail[i];
    eventos.push({
      lead_id: l.id,
      workspace_id: user.workspaceId,
      type: "email_sent",
      payload: {
        providerId: id,
        to: msgs[i].para,
        subject: msgs[i].assunto,
        body: msgs[i].texto.slice(0, 4000),
        step: 1,
        replyTo: user.email,
        followup: d.followup && followAt ? { at: followAt, subject: preencher(texto(d.followup.assunto, 200) || `Re: ${assunto}`, l), body: comAssinatura(preencher(texto(d.followup.corpo, 8000), l)) } : null,
      },
    });
    if (l.status === "Novo") paraSequencia.push(l.id);
  }
  if (eventos.length) await supabase.from("lead_events").insert(eventos);
  // quem estava em "Novo" entra em "Em sequência"
  if (paraSequencia.length) {
    await supabase.from("leads").update({ status: "Em sequência" }).in("id", paraSequencia);
    await supabase
      .from("lead_events")
      .insert(paraSequencia.map((id) => ({ lead_id: id, workspace_id: user.workspaceId, type: "status_changed", payload: { status: "Em sequência" } })));
  }
  return { enviados, semEmail, falharam: comEmail.length - enviados };
}

/** Marca que o lead respondeu: para os follow-ups e move para "Respondeu". */
export async function marcarResposta(leadId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").update({ status: "Respondeu" }).eq("id", leadId).select("id");
  if (error || !data.length) throw new Error("Não foi possível atualizar o lead");
  await supabase.from("lead_events").insert([
    { lead_id: leadId, workspace_id: user.workspaceId, type: "email_replied", payload: {} },
    { lead_id: leadId, workspace_id: user.workspaceId, type: "status_changed", payload: { status: "Respondeu" } },
  ]);
  await avisarCrm(supabase, user.workspaceName, "lead.respondeu", [leadId]);
}

/** Números de e-mail dos últimos 30 dias (Visão geral). */
export async function resumoEmails(): Promise<{ enviados: number; abertos: number; respondidos: number; followups: number }> {
  await requireUser();
  const supabase = await createClient();
  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await supabase
    .from("lead_events")
    .select("lead_id, type, payload")
    .in("type", ["email_sent", "email_opened", "email_replied"])
    .gte("created_at", desde)
    .limit(10000);
  const linhas = data ?? [];
  const abertos = new Set(linhas.filter((e) => e.type === "email_opened").map((e) => (e.payload as { providerId?: string })?.providerId ?? e.lead_id));
  return {
    enviados: linhas.filter((e) => e.type === "email_sent").length,
    followups: linhas.filter((e) => e.type === "email_sent" && Number((e.payload as { step?: number })?.step) > 1).length,
    abertos: abertos.size,
    respondidos: new Set(linhas.filter((e) => e.type === "email_replied").map((e) => e.lead_id)).size,
  };
}
