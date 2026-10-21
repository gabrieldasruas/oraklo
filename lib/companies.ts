import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/db/admin";
import { titleCase } from "@/lib/format";

// A base de empresas só é lida pelo servidor (service role), sempre depois de conferir a sessão.
// Quem chama estas funções é responsável por exigir login (requireUser / getUser).

// Mesmo formato do `filter` dos nichos (ver niche_companies no banco).
export type CompanyFilter = {
  cnaes?: string[];
  ufs?: string[];
  municipalities?: string[];
  sizes?: string[];
  min_share_capital?: number;
  headquarters_only?: boolean;
  has_email?: boolean;
  q?: string;
};

type Row = {
  cnpj: string;
  legal_name: string | null;
  trade_name: string | null;
  is_headquarters: boolean;
  opened_at: string | null;
  cnae_main: string | null;
  uf: string | null;
  municipality_code: string | null;
  size: string | null;
  share_capital: number | null;
  receita_email: string | null;
  receita_phones: string[];
  website: string | null;
  zip: string | null;
  address: string | null;
  district: string | null;
};

export type CompanyItem = {
  cnpj: string;
  name: string;
  legalName: string;
  isHeadquarters: boolean;
  openedAt: string | null;
  cnaeMain: string | null;
  city: string;
  uf: string;
  size: string;
  shareCapital: number | null;
  email: string | null;
  phones: string[];
  website: string | null;
  /** CEP (8 dígitos) — usado para localizar a empresa no mapa */
  zip: string | null;
  address: string | null;
  district: string | null;
};

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean);

// Parâmetros da URL (?cnae=&uf=&municipio=&porte=&capital_min=&tem_email=&matriz=&q=) → filtro.
export function filterFromParams(p: Record<string, string | string[] | undefined>): CompanyFilter {
  const one = (k: string) => (Array.isArray(p[k]) ? p[k][0] : p[k]) as string | undefined;
  const f: CompanyFilter = {};
  const cnaes = list(p.cnae).map((c) => c.replace(/\D/g, "")).filter((c) => c.length === 7);
  const ufs = list(p.uf).map((u) => u.toUpperCase()).filter((u) => /^[A-Z]{2}$/.test(u));
  const municipalities = list(p.municipio).filter((m) => /^\d+$/.test(m));
  const sizes = list(p.porte).filter((s) => ["ME", "EPP", "DEMAIS", "NAO_INFORMADO"].includes(s));
  if (cnaes.length) f.cnaes = cnaes;
  if (ufs.length) f.ufs = ufs;
  if (municipalities.length) f.municipalities = municipalities;
  if (sizes.length) f.sizes = sizes;
  const capital = Number(one("capital_min"));
  if (Number.isFinite(capital) && capital > 0) f.min_share_capital = capital;
  if (one("tem_email") === "1") f.has_email = true;
  if (one("matriz") === "1") f.headquarters_only = true;
  const q = one("q")?.trim().slice(0, 80);
  if (q) f.q = /^[\d./-]+$/.test(q) ? q.replace(/\D/g, "") : q;
  return f;
}

// Cursor opaco: capital e CNPJ da última linha da página.
const encodeCursor = (r: Row) => Buffer.from(`${r.share_capital ?? -1}|${r.cnpj}`).toString("base64url");
function decodeCursor(c: string | undefined) {
  if (!c) return null;
  const [capital, cnpj] = Buffer.from(c, "base64url").toString().split("|");
  return /^\d{14}$/.test(cnpj ?? "") && Number.isFinite(Number(capital)) ? { capital: Number(capital), cnpj } : null;
}

async function municipalityNames(codes: string[]) {
  const unique = [...new Set(codes.filter(Boolean))];
  if (!unique.length) return new Map<string, string>();
  const { data, error } = await createAdminClient().from("municipalities").select("code, name").in("code", unique);
  if (error) throw new Error(`Falha ao ler municípios: ${error.message}`);
  return new Map(data.map((m) => [m.code as string, titleCase(m.name as string)]));
}

function toItem(r: Row, cities: Map<string, string>): CompanyItem {
  const legal = titleCase(r.legal_name ?? "");
  return {
    cnpj: r.cnpj,
    name: r.trade_name ? titleCase(r.trade_name) : legal || r.cnpj,
    legalName: legal,
    isHeadquarters: r.is_headquarters,
    openedAt: r.opened_at,
    cnaeMain: r.cnae_main,
    city: cities.get(r.municipality_code ?? "") ?? "",
    uf: r.uf ?? "",
    size: r.size ?? "NAO_INFORMADO",
    shareCapital: r.share_capital === null ? null : Number(r.share_capital),
    email: r.receita_email,
    phones: r.receita_phones ?? [],
    website: r.website,
    zip: r.zip ? r.zip.replace(/D/g, "").padStart(8, "0") : null,
    address: r.address ? titleCase(r.address) : null,
    district: r.district ? titleCase(r.district) : null,
  };
}

const COLUMNS =
  "cnpj, legal_name, trade_name, is_headquarters, opened_at, cnae_main, uf, municipality_code, size, share_capital, receita_email, receita_phones, website, zip, address, district";

export async function searchCompanies(filter: CompanyFilter, cursor?: string, limit = 50) {
  const after = decodeCursor(cursor);
  const { data, error } = await createAdminClient()
    .rpc("search_companies", {
      f: filter,
      after_capital: after?.capital ?? null,
      after_cnpj: after?.cnpj ?? null,
      lim: limit + 1, // uma a mais para saber se há próxima página
    })
    .select(COLUMNS);
  if (error) throw new Error(`Falha na busca: ${error.message}`);
  const rows = (data ?? []) as unknown as Row[];
  const page = rows.slice(0, limit);
  const cities = await municipalityNames(page.map((r) => r.municipality_code ?? ""));
  return {
    items: page.map((r) => toItem(r, cities)),
    nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1]) : null,
  };
}

export async function countCompanies(filter: CompanyFilter): Promise<number> {
  const { data, error } = await createAdminClient().rpc("count_companies", { f: filter });
  if (error) throw new Error(`Falha na contagem: ${error.message}`);
  return Number(data);
}

export type CompanyDetail = CompanyItem & {
  status: string;
  cnaeMainDescription: string | null;
  cnaeSecondary: { code: string; description: string }[];
  district: string | null;
  address: string | null;
  zip: string | null;
  legalNature: string | null;
  partners: { name: string; kind: string | null; role: string | null; enteredAt: string | null }[];
  sourcePeriod: string;
};

export async function getCompany(cnpj: string): Promise<CompanyDetail | null> {
  if (!/^\d{14}$/.test(cnpj)) return null;
  const db = createAdminClient();
  const { data: c, error } = await db
    .from("companies")
    .select(`${COLUMNS}, status, cnae_secondary, legal_nature, cnpj_root, source_period`)
    .eq("cnpj", cnpj)
    .maybeSingle<Row & { status: string; cnae_secondary: string[]; district: string | null; address: string | null; zip: string | null; legal_nature: string | null; cnpj_root: string; source_period: string }>();
  if (error) throw new Error(`Falha ao ler empresa: ${error.message}`);
  if (!c) return null;

  const codes = [c.cnae_main, ...c.cnae_secondary].filter(Boolean) as string[];
  const [cnaes, partners, cities] = await Promise.all([
    db.from("cnaes").select("code, description").in("code", codes),
    db.from("partners").select("name, kind, role, entered_at").eq("cnpj_root", c.cnpj_root).order("entered_at"),
    municipalityNames([c.municipality_code ?? ""]),
  ]);
  if (cnaes.error || partners.error) throw new Error("Falha ao ler detalhes da empresa");
  const desc = new Map(cnaes.data.map((k) => [k.code as string, k.description as string]));

  return {
    ...toItem(c, cities),
    status: c.status,
    cnaeMainDescription: desc.get(c.cnae_main ?? "") ?? null,
    cnaeSecondary: c.cnae_secondary.map((code) => ({ code, description: desc.get(code) ?? "" })),
    district: c.district ? titleCase(c.district) : null,
    address: c.address ? titleCase(c.address) : null,
    zip: c.zip,
    legalNature: c.legal_nature,
    // Só nome e qualificação do sócio (LGPD); o CPF nem é importado.
    partners: partners.data.map((p) => ({ name: titleCase(p.name as string), kind: p.kind as string | null, role: (p.role as string | null) ?? null, enteredAt: p.entered_at as string | null })),
    sourcePeriod: c.source_period,
  };
}

export type Facets = {
  cnaes: { code: string; description: string; count: number }[];
  ufs: { code: string; count: number }[];
  municipalities: { code: string; name: string; uf: string; count: number }[];
};

export const getFacets = unstable_cache(
  async (): Promise<Facets> => {
    const { data, error } = await createAdminClient().rpc("company_facets");
    if (error) throw new Error(`Falha ao ler filtros: ${error.message}`);
    const f = data as Facets;
    return { ...f, municipalities: f.municipalities.map((m) => ({ ...m, name: titleCase(m.name) })) };
  },
  ["company-facets"],
  { revalidate: 300, tags: ["companies"] },
);
