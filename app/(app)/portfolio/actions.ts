"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { ARQUIVO_TAG, PORTFOLIO_TAG, VISITAS_TAG, completar, type ArquivoResumo, type Portfolio } from "@/lib/portfolio-types";

// Portfólio e arquivos ficam em `lists` (tags especiais), que já tem RLS por workspace.
// Server Actions são endpoints públicos: cada uma confere a sessão; o RLS isola o workspace.

const MAX_PORTFOLIO_BYTES = 1_500_000; // texto + logo/foto já reduzidos no navegador
const MAX_ARQUIVO_BYTES = 3_000_000;
const TIPOS_OK = ["application/pdf", "text/csv", "application/vnd.ms-excel", "image/png", "image/jpeg", "image/webp"];

export async function carregarPortfolio(): Promise<Portfolio> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("lists").select("filter").eq("tag", PORTFOLIO_TAG).order("created_at").limit(1).maybeSingle();
  if (error) throw new Error("Não foi possível carregar o portfólio");
  return completar(data?.filter as Partial<Portfolio> | null);
}

export async function salvarPortfolio(p: Portfolio): Promise<string> {
  const user = await requireUser();
  const dados = { ...completar(p), atualizadoEm: new Date().toISOString() };
  if (JSON.stringify(dados).length > MAX_PORTFOLIO_BYTES) throw new Error("Portfólio grande demais (use imagens menores)");
  const supabase = await createClient();
  const { data: atual } = await supabase.from("lists").select("id").eq("tag", PORTFOLIO_TAG).order("created_at").limit(1).maybeSingle();
  const { error } = atual
    ? await supabase.from("lists").update({ filter: dados, name: `Portfólio — ${dados.identidade.empresa}`.slice(0, 120) }).eq("id", atual.id)
    : await supabase.from("lists").insert({ workspace_id: user.workspaceId, tag: PORTFOLIO_TAG, name: `Portfólio — ${dados.identidade.empresa}`.slice(0, 120), filter: dados });
  if (error) throw new Error("Não foi possível salvar o portfólio");
  return dados.atualizadoEm;
}

export async function listarArquivos(): Promise<ArquivoResumo[]> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .select("id, name, created_at, tipo:filter->>tipo, tamanho:filter->>tamanho")
    .eq("tag", ARQUIVO_TAG)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os arquivos");
  return (data as { id: string; name: string; created_at: string; tipo: string; tamanho: string }[]).map((r) => ({
    id: r.id,
    nome: r.name,
    tipo: r.tipo ?? "",
    tamanho: Number(r.tamanho) || 0,
    criadoEm: r.created_at,
  }));
}

/** Recebe um arquivo (PDF, CSV ou imagem) e guarda no workspace. */
export async function enviarArquivo(form: FormData): Promise<ArquivoResumo> {
  const user = await requireUser();
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File)) throw new Error("Nenhum arquivo enviado");
  const tipo = arquivo.type || (arquivo.name.toLowerCase().endsWith(".csv") ? "text/csv" : "");
  if (!TIPOS_OK.includes(tipo)) throw new Error("Formato não aceito. Envie PDF, CSV, PNG, JPG ou WEBP.");
  if (arquivo.size > MAX_ARQUIVO_BYTES) throw new Error("Arquivo maior que 3 MB.");
  const base64 = Buffer.from(await arquivo.arrayBuffer()).toString("base64");
  const nome = arquivo.name.slice(0, 120) || "arquivo";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .insert({ workspace_id: user.workspaceId, tag: ARQUIVO_TAG, name: nome, filter: { tipo, tamanho: arquivo.size, dados: `data:${tipo};base64,${base64}` } })
    .select("id, created_at")
    .single();
  if (error) throw new Error("Não foi possível guardar o arquivo");
  return { id: data.id, nome, tipo, tamanho: arquivo.size, criadoEm: data.created_at };
}

/** Conteúdo do arquivo (data URL) para baixar ou visualizar. */
export async function baixarArquivo(id: string): Promise<{ nome: string; dados: string }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from("lists").select("name, filter").eq("id", id).eq("tag", ARQUIVO_TAG).maybeSingle();
  if (error || !data) throw new Error("Arquivo não encontrado");
  return { nome: data.name, dados: (data.filter as { dados: string }).dados };
}

export async function removerArquivo(id: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("lists").delete().eq("id", id).eq("tag", ARQUIVO_TAG);
  if (error) throw new Error("Não foi possível remover o arquivo");
}

/** Id do portfólio (para o link público) e visitas registradas. */
export async function estatisticasPortfolio(): Promise<{ id: string | null; total: number; semana: number; ultima: string | null }> {
  await requireUser();
  const supabase = await createClient();
  const [{ data: port }, { data: vis }] = await Promise.all([
    supabase.from("lists").select("id").eq("tag", PORTFOLIO_TAG).order("created_at").limit(1).maybeSingle(),
    supabase.from("lists").select("filter").eq("tag", VISITAS_TAG).limit(1).maybeSingle(),
  ]);
  const f = (vis?.filter ?? {}) as { total?: number; porDia?: Record<string, number>; ultima?: string };
  const desde = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const semana = Object.entries(f.porDia ?? {}).reduce((s, [d, n]) => (d >= desde ? s + n : s), 0);
  return { id: (port?.id as string) ?? null, total: f.total ?? 0, semana, ultima: f.ultima ?? null };
}
