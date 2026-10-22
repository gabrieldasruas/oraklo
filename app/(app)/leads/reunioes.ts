"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { CATEGORIAS, type CategoriaId, type Reuniao, type ReuniaoInput } from "@/lib/meeting-types";

// Reuniões guardadas como eventos em `lead_events` (ver lib/meeting-types.ts).
// Server Actions são endpoints públicos: cada uma confere a sessão; o RLS isola o workspace.

type EventoRow = { lead_id: string; type: string; payload: Record<string, unknown>; created_at: string };

const texto = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const categoriaValida = (c: unknown): CategoriaId => (CATEGORIAS.some((k) => k.id === c) ? (c as CategoriaId) : "reuniao");
const dataValida = (v: unknown) => {
  const d = new Date(String(v ?? ""));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** Monta o estado atual das reuniões aplicando os eventos em ordem. */
export async function listarReunioes(): Promise<Reuniao[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_events")
    .select("lead_id, type, payload, created_at")
    .in("type", ["meeting_created", "meeting_updated", "meeting_canceled"])
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(5000);
  if (error) throw new Error("Não foi possível carregar as reuniões");

  const mapa = new Map<string, Reuniao>();
  for (const e of data as EventoRow[]) {
    const p = e.payload ?? {};
    const id = String(p.meetingId ?? "");
    if (!id) continue;
    if (e.type === "meeting_created") {
      mapa.set(id, {
        id,
        leadId: e.lead_id,
        title: texto(p.title, 120) || "Reunião",
        start: String(p.start),
        end: String(p.end),
        category: categoriaValida(p.category),
        notes: texto(p.notes, 1000),
        canceled: false,
        createdAt: e.created_at,
      });
    } else {
      const r = mapa.get(id);
      if (!r) continue;
      if (e.type === "meeting_canceled") r.canceled = true;
      else {
        if (p.title !== undefined) r.title = texto(p.title, 120) || r.title;
        if (p.start !== undefined) r.start = String(p.start);
        if (p.end !== undefined) r.end = String(p.end);
        if (p.category !== undefined) r.category = categoriaValida(p.category);
        if (p.notes !== undefined) r.notes = texto(p.notes, 1000);
      }
    }
  }
  return [...mapa.values()].filter((r) => !r.canceled);
}

export async function criarReuniao(input: ReuniaoInput): Promise<Reuniao> {
  const user = await requireUser();
  const start = dataValida(input.start);
  const end = dataValida(input.end);
  if (!input.leadId || !start || !end) throw new Error("Lead, início e fim são obrigatórios");
  if (new Date(end) <= new Date(start)) throw new Error("O fim precisa ser depois do início");

  const meetingId = crypto.randomUUID();
  const payload = {
    meetingId,
    title: texto(input.title, 120) || "Reunião",
    start,
    end,
    category: categoriaValida(input.category),
    notes: texto(input.notes, 1000),
  };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_events")
    .insert({ lead_id: input.leadId, workspace_id: user.workspaceId, type: "meeting_created", payload })
    .select("created_at")
    .single();
  if (error) throw new Error("Não foi possível agendar a reunião");

  // mover o lead para "Reunião marcada" é feito pela tela (updateLeadStatus), para registrar um evento só
  return { id: meetingId, leadId: input.leadId, ...payload, canceled: false, createdAt: data.created_at } as Reuniao;
}

export async function atualizarReuniao(
  leadId: string,
  meetingId: string,
  campos: Partial<Pick<Reuniao, "title" | "start" | "end" | "category" | "notes">>,
): Promise<void> {
  const user = await requireUser();
  const payload: Record<string, unknown> = { meetingId };
  if (campos.title !== undefined) payload.title = texto(campos.title, 120);
  if (campos.start !== undefined) payload.start = dataValida(campos.start);
  if (campos.end !== undefined) payload.end = dataValida(campos.end);
  if (campos.category !== undefined) payload.category = categoriaValida(campos.category);
  if (campos.notes !== undefined) payload.notes = texto(campos.notes, 1000);
  if (payload.start === null || payload.end === null) throw new Error("Data inválida");
  const supabase = await createClient();
  const { error } = await supabase.from("lead_events").insert({ lead_id: leadId, workspace_id: user.workspaceId, type: "meeting_updated", payload });
  if (error) throw new Error("Não foi possível alterar a reunião");
}

export async function cancelarReuniao(leadId: string, meetingId: string): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("lead_events")
    .insert({ lead_id: leadId, workspace_id: user.workspaceId, type: "meeting_canceled", payload: { meetingId } });
  if (error) throw new Error("Não foi possível cancelar a reunião");
}
