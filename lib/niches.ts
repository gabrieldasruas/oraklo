import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/db/admin";
import { niches as exampleNiches, type Niche } from "@/content/app";

type NicheRow = {
  id: string;
  group_name: string;
  name: string;
  description: string | null;
  icon: string | null;
  region: string | null;
  roles: string[];
  tags: string[];
  companies_count: number | null;
  contacts_count: number | null;
  avg_score: number | null;
  sample_cnpjs: string[];
};

// Nomes da Receita vêm em caixa alta: "TRANSPORTES MARVEL S.A." → "Transportes Marvel S.A."
const LOWER = new Set(["de", "da", "do", "das", "dos", "e"]);
function titleCase(name: string) {
  return name
    .toLowerCase()
    .split(" ")
    .map((w, i) => (w.includes(".") ? w.toUpperCase() : i > 0 && LOWER.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

async function fetchNiches(): Promise<Niche[]> {
  const db = createAdminClient();
  const { data: rows, error } = await db
    .from("niches")
    .select("id, group_name, name, description, icon, region, roles, tags, companies_count, contacts_count, avg_score, sample_cnpjs")
    .returns<NicheRow[]>();
  if (error) throw new Error(`Falha ao ler nichos: ${error.message}`);

  const cnpjs = rows.flatMap((r) => r.sample_cnpjs);
  const names = new Map<string, string>();
  if (cnpjs.length) {
    const { data: companies, error: e } = await db.from("companies").select("cnpj, trade_name, legal_name").in("cnpj", cnpjs);
    if (e) throw new Error(`Falha ao ler empresas de exemplo: ${e.message}`);
    for (const c of companies) names.set(c.cnpj, titleCase(c.trade_name ?? c.legal_name ?? c.cnpj));
  }

  const real = new Map(
    rows.map((r): [string, Niche] => [
      r.id,
      {
        id: r.id,
        group: r.group_name,
        icon: r.icon ?? "",
        name: r.name,
        region: r.region ?? "",
        description: r.description ?? "",
        companies: r.companies_count ?? 0,
        contacts: r.contacts_count ?? 0,
        score: r.avg_score,
        roles: r.roles,
        samples: r.sample_cnpjs.map((c) => names.get(c) ?? c),
        tags: r.tags,
      },
    ]),
  );

  // Nichos ainda não importados continuam com os dados de exemplo, marcados como prévia.
  const merged = exampleNiches.map((n) => real.get(n.id) ?? { ...n, preview: true });
  for (const [id, n] of real) if (!exampleNiches.some((e) => e.id === id)) merged.push(n);
  return merged;
}

// As contagens só mudam após uma importação ou enriquecimento.
export const getNiches = unstable_cache(fetchNiches, ["niches"], { revalidate: 3600, tags: ["niches"] });
