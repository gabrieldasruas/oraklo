"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { filterFromParams } from "@/lib/companies";

export type ListActionState = { error?: string };

// Cria uma lista com o resultado de uma busca. O filtro é refeito no servidor a partir da
// query string, então a lista tem exatamente as empresas que a busca mostrou (até 5.000).
export async function createListFromSearch(_: ListActionState, form: FormData): Promise<ListActionState> {
  await requireUser();
  const name = String(form.get("name") ?? "").trim().slice(0, 120);
  if (!name) return { error: "Dê um nome para a lista." };
  const query = new URLSearchParams(String(form.get("query") ?? ""));
  const params: Record<string, string | string[]> = {};
  for (const key of new Set(query.keys())) params[key] = query.getAll(key);
  const filter = filterFromParams(params);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_list_from_filter", { p_name: name, p_filter: filter, p_tag: "Busca" });
  if (error) return { error: "Não foi possível criar a lista. Tente de novo." };
  revalidatePath("/listas");
  redirect(`/listas/${data}`);
}

export async function createListFromNiche(form: FormData): Promise<void> {
  await requireUser();
  const nicheId = String(form.get("niche") ?? "");
  const { data: niche } = await createAdminClient().from("niches").select("id, name, group_name, filter").eq("id", nicheId).maybeSingle();
  if (!niche) throw new Error("Nicho não encontrado");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_list_from_filter", {
    p_name: niche.name,
    p_filter: niche.filter,
    p_niche: niche.id,
    p_tag: niche.group_name,
  });
  if (error) throw new Error("Não foi possível criar a lista");
  revalidatePath("/listas");
  redirect(`/listas/${data}`);
}

export async function deleteList(form: FormData): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("lists").delete().eq("id", String(form.get("id") ?? ""));
  if (error) throw new Error("Não foi possível excluir a lista");
  revalidatePath("/listas");
  redirect("/listas");
}
