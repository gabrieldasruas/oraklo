"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { getCompany } from "@/lib/companies";
import { escreverAbordagem, iaConfigurada } from "@/lib/ia";
import { LIMITES, planoDoWorkspace, restante, usoDoMes } from "@/lib/planos";
import { PORTFOLIO_TAG, completar, type Portfolio } from "@/lib/portfolio-types";
import { formatMoney, SIZE_LABEL } from "@/lib/format";
import { avisarCrm } from "@/lib/crm-webhook";

// Abordagem: escrever com IA e registrar mensagens de WhatsApp no histórico do lead.
// Server Actions são endpoints públicos: cada uma confere a sessão; o RLS isola o workspace.
// Erros voltam como { ok: false, erro } (em produção o Next esconde a mensagem de exceções).

export async function iaDisponivel(): Promise<boolean> {
  await requireUser();
  return iaConfigurada();
}

export async function escreverComIA(o: {
  leadId: string | null;
  canal: "email" | "whatsapp";
  modelo: boolean;
  instrucao?: string;
}): Promise<{ ok: true; assunto: string; texto: string } | { ok: false; erro: string }> {
  const user = await requireUser();
  const db = await createClient();

  const limite = LIMITES[await planoDoWorkspace(db, user.workspaceId)].iaMes;
  if (restante(limite, (await usoDoMes(db)).ia) === 0) return { ok: false, erro: `Você usou os ${limite} textos com IA do plano Grátis este mês.` };

  const [{ data: lead }, { data: port }] = await Promise.all([
    o.leadId ? db.from("leads").select("id, name, role, company, place, cnpj").eq("id", o.leadId).maybeSingle() : Promise.resolve({ data: null }),
    db.from("lists").select("filter").eq("tag", PORTFOLIO_TAG).limit(1).maybeSingle(),
  ]);
  if (o.leadId && !lead) return { ok: false, erro: "Lead não encontrado." };
  const p: Portfolio = completar(port?.filter as Partial<Portfolio> | null);
  const empresa = lead?.cnpj ? await getCompany(String(lead.cnpj).trim()).catch(() => null) : null;

  const r = await escreverAbordagem({
    canal: o.canal,
    modelo: o.modelo,
    lead: { nome: lead?.name ?? "", cargo: lead?.role ?? "", empresa: lead?.company ?? "", cidade: lead?.place ?? "" },
    empresa: empresa
      ? {
          atividade: empresa.cnaeMainDescription,
          porte: SIZE_LABEL[empresa.size] ?? null,
          anos: empresa.openedAt ? Math.floor((Date.now() - new Date(empresa.openedAt).getTime()) / (365.25 * 86_400_000)) : null,
          capital: empresa.shareCapital ? formatMoney(empresa.shareCapital) : null,
          matriz: empresa.isHeadquarters,
        }
      : null,
    remetente: {
      nome: p.identidade.nome === "Seu nome" ? user.name : p.identidade.nome,
      empresa: p.identidade.empresa === "Sua empresa" ? user.workspaceName : p.identidade.empresa,
      tagline: p.identidade.tagline,
      solucoes: p.solucoes.slice(0, 5).map((s) => `${s.titulo}${s.descricao ? ` (${s.descricao})` : ""}`),
      cases: p.cases.slice(0, 3).map((c) => `${c.cliente}: ${c.resultado}`),
      temLinkPortfolio: !!p.compartilhar?.ativo,
    },
    instrucao: o.instrucao,
  });

  // conta no limite do mês (o evento fica no lead; no modelo em massa, no primeiro lead disponível)
  if (r.ok) {
    const alvo = o.leadId ?? (await db.from("leads").select("id").limit(1).maybeSingle()).data?.id;
    if (alvo) await db.from("lead_events").insert({ lead_id: alvo, workspace_id: user.workspaceId, type: "ai_generated", payload: { canal: o.canal, modelo: o.modelo } });
  }
  return r;
}

/** Registra que uma mensagem de WhatsApp foi aberta para o lead (e o tira de "Novo"). */
export async function registrarWhatsapp(leadId: string, texto: string, modelo: string | null): Promise<{ moveu: boolean }> {
  const user = await requireUser();
  const db = await createClient();
  const { data: lead } = await db.from("leads").select("id, status").eq("id", leadId).maybeSingle();
  if (!lead) return { moveu: false };
  const eventos: Record<string, unknown>[] = [{ lead_id: leadId, workspace_id: user.workspaceId, type: "whatsapp_opened", payload: { text: texto.slice(0, 1000), modelo } }];
  const moveu = lead.status === "Novo";
  if (moveu) {
    await db.from("leads").update({ status: "Em sequência" }).eq("id", leadId);
    eventos.push({ lead_id: leadId, workspace_id: user.workspaceId, type: "status_changed", payload: { status: "Em sequência" } });
  }
  await db.from("lead_events").insert(eventos);
  if (moveu) await avisarCrm(db, user.workspaceName, "lead.etapa", [leadId], { etapaNova: "Em sequência" });
  return { moveu };
}
