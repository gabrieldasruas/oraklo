"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { montarTarefas, type EventoLead, type Tarefa } from "@/lib/lead-events";
import { agendarRd } from "@/lib/rd-sync";

// Histórico, notas e tarefas do lead — tudo como eventos em `lead_events` (sem tabela nova).
// Server Actions são endpoints públicos: cada uma confere a sessão; o RLS isola o workspace.

type Row = { id: number; lead_id: string; type: string; payload: Record<string, unknown> | null; created_at: string };
const paraEvento = (r: Row): EventoLead => ({ id: r.id, leadId: r.lead_id, type: r.type, payload: r.payload ?? {}, createdAt: r.created_at });
const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const novoId = () => crypto.randomUUID().slice(0, 12);

async function registrar(leadId: string, type: string, payload: Record<string, unknown>) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_events")
    .insert({ lead_id: leadId, workspace_id: user.workspaceId, type, payload })
    .select("id, lead_id, type, payload, created_at")
    .single();
  if (error) throw new Error("Não foi possível salvar");
  return paraEvento(data as Row);
}

/** Linha do tempo do lead (mais recente primeiro). */
export async function historicoDoLead(leadId: string): Promise<EventoLead[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_events")
    .select("id, lead_id, type, payload, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(300);
  if (error) throw new Error("Não foi possível carregar o histórico");
  return (data as Row[]).map(paraEvento);
}

export async function adicionarNota(leadId: string, nota: string): Promise<EventoLead> {
  const t = texto(nota, 2000);
  if (!t) throw new Error("Escreva a nota");
  const ev = await registrar(leadId, "note", { text: t });
  await agendarRd(await createClient(), "nota", [leadId], `Nota do Oraklo: ${t}`).catch(() => {});
  return ev;
}

export async function criarTarefa(leadId: string, titulo: string, vence: string | null): Promise<EventoLead> {
  const t = texto(titulo, 160);
  if (!t) throw new Error("Escreva a tarefa");
  const d = vence ? new Date(vence) : null;
  return registrar(leadId, "task_created", { taskId: novoId(), title: t, due: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null });
}

export async function concluirTarefa(leadId: string, taskId: string, titulo: string, feita: boolean): Promise<EventoLead> {
  return registrar(leadId, "task_done", { taskId: texto(taskId, 40), title: texto(titulo, 160), done: feita });
}

/** Tarefas em aberto de todo o workspace (Visão geral e lembretes). */
export async function tarefasDoWorkspace(): Promise<Tarefa[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_events")
    .select("id, lead_id, type, payload, created_at")
    .in("type", ["task_created", "task_done"])
    .order("created_at", { ascending: true })
    .limit(5000);
  if (error) throw new Error("Não foi possível carregar as tarefas");
  return montarTarefas((data as Row[]).map(paraEvento));
}
