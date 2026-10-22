"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { CONFIG_TAG, completarConfig, webhookPermitido, type ConfigWorkspace } from "@/lib/config-workspace";
import { enviarWebhook } from "@/lib/crm-webhook";

// Configurações do workspace. Server Actions são endpoints públicos: cada uma confere a sessão.

async function linha() {
  const supabase = await createClient();
  const { data } = await supabase.from("lists").select("id, filter").eq("tag", CONFIG_TAG).order("created_at").limit(1).maybeSingle();
  return { supabase, id: (data?.id as string | undefined) ?? null, config: completarConfig(data?.filter as Partial<ConfigWorkspace> | null) };
}

export async function carregarConfig(): Promise<ConfigWorkspace> {
  await requireUser();
  return (await linha()).config;
}

export async function salvarConfig(c: ConfigWorkspace): Promise<ConfigWorkspace> {
  const user = await requireUser();
  const dados = completarConfig(c);
  if (dados.crm.webhookUrl && !webhookPermitido(dados.crm.webhookUrl)) throw new Error("Use um endereço https público para o webhook");
  const { supabase, id } = await linha();
  const { error } = id
    ? await supabase.from("lists").update({ filter: dados }).eq("id", id)
    : await supabase.from("lists").insert({ workspace_id: user.workspaceId, tag: CONFIG_TAG, name: "Configurações", filter: dados });
  if (error) throw new Error("Não foi possível salvar as configurações");
  return dados;
}

/** Seu nome (aparece no app e nas variáveis {meu_nome} quando o portfólio não tiver). */
export async function salvarNome(nome: string): Promise<void> {
  await requireUser();
  const n = nome.trim().slice(0, 80);
  if (!n) throw new Error("Escreva seu nome");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data: { name: n } });
  if (error) throw new Error("Não foi possível salvar seu nome");
}

/** Renomeia o workspace (só administradores). */
export async function renomearWorkspace(nome: string): Promise<void> {
  const user = await requireUser();
  const n = nome.trim().slice(0, 80);
  if (!n) throw new Error("Escreva o nome da empresa");
  const supabase = await createClient();
  const { data: eu } = await supabase.from("members").select("role").eq("workspace_id", user.workspaceId).eq("user_id", user.id).maybeSingle();
  if (eu?.role !== "admin") throw new Error("Só administradores podem renomear");
  const { error } = await createAdminClient().from("workspaces").update({ name: n }).eq("id", user.workspaceId);
  if (error) throw new Error("Não foi possível renomear");
}

/** Manda um evento de teste para o webhook do CRM. */
export async function testarWebhook(url: string): Promise<{ ok: boolean; status: number | null }> {
  const user = await requireUser();
  if (!webhookPermitido(url)) throw new Error("Use um endereço https público");
  return enviarWebhook(url, {
    evento: "teste",
    workspace: user.workspaceName,
    enviadoEm: new Date().toISOString(),
    lead: { id: "00000000-0000-0000-0000-000000000000", nome: "Maria Exemplo", cargo: "Sócia-administradora", empresa: "Empresa Exemplo Ltda", email: "maria@exemplo.com.br", telefone: "47999990000", cidade: "Itajaí, SC", etapa: "Novo", score: 82, cnpj: "00000000000000" },
  });
}
