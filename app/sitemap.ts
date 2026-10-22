import type { MetadataRoute } from "next";
import { getFacets } from "@/lib/companies";
import { slugCidade } from "@/lib/consulta";
import { urlDoApp } from "@/lib/email";

// Páginas públicas para o Google: site, guias e a consulta de empresas por cidade.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlDoApp();
  const fixas = ["", "/produto", "/precos", "/historias", "/consulta", "/privacidade"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "" ? 1 : 0.7 }));
  const facets = await getFacets().catch(() => null);
  const cidades = (facets?.municipalities ?? []).map((m) => ({ url: `${base}/consulta/${slugCidade(m.name, m.uf)}`, changeFrequency: "monthly" as const, priority: 0.6 }));
  return [...fixas, ...cidades];
}
