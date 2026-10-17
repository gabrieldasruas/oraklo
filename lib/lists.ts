import "server-only";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { formatCnae, formatCnpj, formatPhone, SIZE_LABEL, titleCase } from "@/lib/format";
import type { CompanyFilter } from "@/lib/companies";

// Listas são do workspace: lidas com o cliente do usuário (RLS). As empresas de cada lista
// são lidas com a service role, depois que o RLS confirmou que a lista é visível ao usuário.

export type ListSummary = { id: string; name: string; tag: string | null; nicheId: string | null; count: number; createdAt: string; mine: boolean };

export async function getLists(userId: string): Promise<ListSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .select("id, name, tag, niche_id, owner_id, created_at, list_items(count)")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível carregar as listas");
  return data.map((l) => ({
    id: l.id,
    name: l.name,
    tag: l.tag,
    nicheId: l.niche_id,
    count: (l.list_items as unknown as { count: number }[])[0]?.count ?? 0,
    createdAt: l.created_at,
    mine: l.owner_id === userId,
  }));
}

export async function getList(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lists")
    .select("id, name, tag, niche_id, filter, created_at, list_items(count)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar a lista");
  if (!data) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    tag: data.tag as string | null,
    nicheId: data.niche_id as string | null,
    filter: data.filter as CompanyFilter | null,
    createdAt: data.created_at as string,
    count: (data.list_items as unknown as { count: number }[])[0]?.count ?? 0,
  };
}

// CNPJs da lista (RLS), do item `from` ao `to` (inclusive). A API do Supabase devolve no máximo
// 1.000 linhas por requisição, então intervalos maiores são lidos em blocos.
export async function getListCnpjs(id: string, from = 0, to = 4999): Promise<string[]> {
  const supabase = await createClient();
  const out: string[] = [];
  for (let start = from; start <= to; start += 1000) {
    const end = Math.min(start + 999, to);
    const { data, error } = await supabase
      .from("list_items")
      .select("cnpj")
      .eq("list_id", id)
      .order("added_at")
      .order("cnpj")
      .range(start, end);
    if (error) throw new Error("Não foi possível ler os itens da lista");
    out.push(...data.map((r) => r.cnpj as string));
    if (data.length < end - start + 1) break;
  }
  return out;
}

export async function getQuotaUsage(workspaceId: string) {
  const supabase = await createClient();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const [{ data: ws }, { data: exports }] = await Promise.all([
    supabase.from("workspaces").select("monthly_quota").eq("id", workspaceId).single(),
    supabase.from("exports").select("rows").eq("workspace_id", workspaceId).gte("created_at", monthStart),
  ]);
  return { quota: (ws?.monthly_quota as number) ?? 0, used: (exports ?? []).reduce((s, e) => s + (e.rows as number), 0) };
}

// CSV no padrão do Excel em português: separador ';' e BOM para acentos.
const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const chunks = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

export async function buildListCsv(cnpjs: string[]): Promise<string> {
  const db = createAdminClient();
  type C = {
    cnpj: string; cnpj_root: string; legal_name: string | null; trade_name: string | null; is_headquarters: boolean;
    opened_at: string | null; cnae_main: string | null; uf: string | null; municipality_code: string | null;
    district: string | null; address: string | null; zip: string | null; size: string | null; share_capital: number | null;
    receita_email: string | null; receita_phones: string[]; website: string | null;
  };
  const companies: C[] = [];
  for (const part of chunks(cnpjs, 300)) {
    const { data, error } = await db
      .from("companies")
      .select("cnpj, cnpj_root, legal_name, trade_name, is_headquarters, opened_at, cnae_main, uf, municipality_code, district, address, zip, size, share_capital, receita_email, receita_phones, website")
      .in("cnpj", part);
    if (error) throw new Error(`Falha ao ler empresas: ${error.message}`);
    companies.push(...(data as C[]));
  }

  const roots = [...new Set(companies.map((c) => c.cnpj_root))];
  const partners = new Map<string, string[]>();
  // Blocos pequenos: cada empresa tem vários sócios e a API devolve no máximo 1.000 linhas.
  for (const part of chunks(roots, 100)) {
    const { data, error } = await db.from("partners").select("cnpj_root, name").in("cnpj_root", part);
    if (error) throw new Error(`Falha ao ler sócios: ${error.message}`);
    for (const p of data) partners.set(p.cnpj_root, [...(partners.get(p.cnpj_root) ?? []), titleCase(p.name)]);
  }
  const cnaeCodes = [...new Set(companies.map((c) => c.cnae_main).filter(Boolean))] as string[];
  const cityCodes = [...new Set(companies.map((c) => c.municipality_code).filter(Boolean))] as string[];
  const [{ data: cnaes }, { data: cities }] = await Promise.all([
    db.from("cnaes").select("code, description").in("code", cnaeCodes),
    db.from("municipalities").select("code, name").in("code", cityCodes),
  ]);
  const cnaeDesc = new Map((cnaes ?? []).map((k) => [k.code, k.description]));
  const cityName = new Map((cities ?? []).map((m) => [m.code, titleCase(m.name)]));

  const order = new Map(cnpjs.map((c, i) => [c, i]));
  companies.sort((a, b) => order.get(a.cnpj)! - order.get(b.cnpj)!);

  const header = [
    "CNPJ", "Nome fantasia", "Razão social", "Matriz", "CNAE principal", "Atividade", "Porte", "Capital social",
    "Abertura", "Município", "UF", "Bairro", "Endereço", "CEP", "E-mail", "Telefones", "Site", "Sócios",
  ];
  const lines = companies.map((c) =>
    [
      formatCnpj(c.cnpj),
      c.trade_name ? titleCase(c.trade_name) : "",
      titleCase(c.legal_name ?? ""),
      c.is_headquarters ? "Sim" : "Não",
      c.cnae_main ? formatCnae(c.cnae_main) : "",
      cnaeDesc.get(c.cnae_main ?? "") ?? "",
      SIZE_LABEL[c.size ?? ""] ?? "",
      c.share_capital === null ? "" : Number(c.share_capital).toFixed(2).replace(".", ","),
      c.opened_at ? c.opened_at.split("-").reverse().join("/") : "",
      cityName.get(c.municipality_code ?? "") ?? "",
      c.uf ?? "",
      c.district ? titleCase(c.district) : "",
      c.address ? titleCase(c.address) : "",
      c.zip ?? "",
      c.receita_email ?? "",
      (c.receita_phones ?? []).map(formatPhone).join(" / "),
      c.website ?? "",
      (partners.get(c.cnpj_root) ?? []).join(" | "),
    ].map(csvCell).join(";"),
  );
  return "﻿" + [header.join(";"), ...lines].join("\r\n");
}
