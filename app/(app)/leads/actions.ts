"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { getCompany } from "@/lib/companies";
import { STATUSES, type Lead, type LeadInput, type Status } from "@/lib/lead-types";

type LeadRow = {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  place: string;
  status: Status;
  score: number;
  created_at: string;
};

const COLUMNS = "id, name, role, company, email, phone, place, status, score, created_at";
const toLead = (r: LeadRow): Lead => ({
  id: r.id,
  name: r.name,
  role: r.role,
  company: r.company,
  email: r.email,
  phone: r.phone,
  place: r.place,
  status: r.status,
  score: r.score,
  createdAt: r.created_at,
});

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

// Server Actions são endpoints públicos: cada uma confere a sessão; o RLS isola o workspace.

export async function listLeads(): Promise<Lead[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").select(COLUMNS).order("created_at", { ascending: false }).limit(1000);
  if (error) throw new Error("Não foi possível carregar os leads");
  return (data as LeadRow[]).map(toLead);
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const user = await requireUser();
  const status = STATUSES.includes(input.status) ? input.status : "Novo";
  const row = {
    workspace_id: user.workspaceId,
    name: text(input.name, 80),
    role: text(input.role, 80),
    company: text(input.company, 80),
    email: text(input.email, 120),
    phone: text(input.phone, 30),
    place: text(input.place, 80),
    status,
    score: Math.min(100, Math.max(0, Math.round(Number(input.score) || 0))),
  };
  if (!row.name || !row.company) throw new Error("Nome e empresa são obrigatórios");
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").insert(row).select(COLUMNS).single();
  if (error) throw new Error("Não foi possível salvar o lead");
  await supabase.from("lead_events").insert({ lead_id: data.id, workspace_id: user.workspaceId, type: "created" });
  return toLead(data as LeadRow);
}

export async function updateLeadStatus(id: string, status: Status): Promise<void> {
  const user = await requireUser();
  if (!STATUSES.includes(status)) throw new Error("Status inválido");
  const supabase = await createClient();
  const { data, error } = await supabase.from("leads").update({ status }).eq("id", id).select("id");
  if (error || !data.length) throw new Error("Não foi possível atualizar o status");
  await supabase
    .from("lead_events")
    .insert({ lead_id: id, workspace_id: user.workspaceId, type: "status_changed", payload: { status } });
}

export async function deleteLead(id: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error("Não foi possível excluir o lead");
}

// "Adicionar aos leads" no detalhe da empresa: usa o primeiro sócio como contato (decisor do QSA).
export async function addCompanyAsLead(form: FormData): Promise<void> {
  const user = await requireUser();
  const company = await getCompany(String(form.get("cnpj") ?? ""));
  if (!company) throw new Error("Empresa não encontrada");
  const partner = company.partners.find((p) => p.kind === "PF") ?? company.partners[0];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      workspace_id: user.workspaceId,
      cnpj: company.cnpj,
      name: (partner?.name ?? "Contato principal").slice(0, 80),
      role: partner ? "Sócio" : "",
      company: company.name.slice(0, 80),
      email: company.email ?? "",
      phone: company.phones[0] ?? "",
      place: [company.city, company.uf].filter(Boolean).join(", "),
    })
    .select("id")
    .single();
  if (error) throw new Error("Não foi possível criar o lead");
  await supabase.from("lead_events").insert({ lead_id: data.id, workspace_id: user.workspaceId, type: "created", payload: { from: "company" } });
  redirect("/leads");
}
