"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { PERFIL_TAG, aplicarSinal, completarPerfil, type EmpresaPerfil, type PerfilBusca } from "@/lib/perfil-busca";

// Perfil de cliente ideal do workspace, guardado em `lists` (RLS por workspace).
// Server Actions são endpoints públicos: cada uma confere a sessão.

async function linha() {
  const supabase = await createClient();
  const { data } = await supabase.from("lists").select("id, filter").eq("tag", PERFIL_TAG).order("created_at").limit(1).maybeSingle();
  return { supabase, id: (data?.id as string | undefined) ?? null, perfil: completarPerfil(data?.filter as Partial<PerfilBusca> | null) };
}

export async function carregarPerfil(): Promise<PerfilBusca> {
  await requireUser();
  return (await linha()).perfil;
}

async function gravar(p: PerfilBusca): Promise<PerfilBusca> {
  const user = await requireUser();
  const { supabase, id } = await linha();
  const dados = { ...completarPerfil(p), atualizadoEm: new Date().toISOString() };
  const { error } = id
    ? await supabase.from("lists").update({ filter: dados }).eq("id", id)
    : await supabase.from("lists").insert({ workspace_id: user.workspaceId, tag: PERFIL_TAG, name: "Perfil de cliente ideal", filter: dados });
  if (error) throw new Error("Não foi possível salvar o perfil");
  return dados;
}

/** Salva as preferências (mantém o que a busca já aprendeu). */
export async function salvarPerfil(p: Omit<PerfilBusca, "aprendizado">): Promise<PerfilBusca> {
  await requireUser();
  const { perfil } = await linha();
  return gravar({ ...perfil, ...p, aprendizado: perfil.aprendizado });
}

/** 👍 / 👎 numa empresa da busca (ou 0 para desfazer). */
export async function registrarSinal(c: Pick<EmpresaPerfil, "cnpj" | "cnaeMain" | "size" | "city" | "uf">, sinal: 1 | -1 | 0): Promise<PerfilBusca> {
  await requireUser();
  if (!/^\d{14}$/.test(c.cnpj) || ![1, -1, 0].includes(sinal)) throw new Error("Sinal inválido");
  const { perfil } = await linha();
  return gravar(aplicarSinal(perfil, { cnpj: c.cnpj, cnaeMain: c.cnaeMain ? String(c.cnaeMain).slice(0, 7) : null, size: String(c.size ?? "").slice(0, 20), city: String(c.city ?? "").slice(0, 80), uf: String(c.uf ?? "").slice(0, 2) }, sinal));
}

/** Zera o que a busca aprendeu. */
export async function esquecerAprendizado(): Promise<PerfilBusca> {
  await requireUser();
  const { perfil } = await linha();
  return gravar({ ...perfil, aprendizado: completarPerfil(null).aprendizado });
}
