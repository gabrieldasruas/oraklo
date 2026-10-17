import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, Search } from "lucide-react";
import { site } from "@/content/site";
import { requireUser } from "@/lib/auth";
import { countCompanies, filterFromParams, getFacets, searchCompanies } from "@/lib/companies";
import { formatCnae, formatCnpj, formatMoney, SIZE_LABEL } from "@/lib/format";
import PageHeader from "@/components/app/PageHeader";
import SaveListForm from "@/components/app/SaveListForm";
import { Glass, Micro } from "@/components/app/ui";

export const metadata: Metadata = { title: `Empresas — ${site.name}` };

type SP = Record<string, string | string[] | undefined>;

const field = "mt-2 min-h-12 w-full rounded-2xl border border-night/10 bg-white/80 px-4 text-base";
const CAPITALS = [
  { v: "", l: "Qualquer" },
  { v: "50000", l: "A partir de R$ 50 mil" },
  { v: "100000", l: "A partir de R$ 100 mil" },
  { v: "500000", l: "A partir de R$ 500 mil" },
  { v: "1000000", l: "A partir de R$ 1 milhão" },
];

// Query string só com os filtros (sem cursor), para paginação e para salvar como lista.
function filterQuery(sp: SP) {
  const q = new URLSearchParams();
  for (const k of ["q", "cnae", "uf", "municipio", "porte", "capital_min", "tem_email", "matriz"]) {
    const v = sp[k];
    for (const item of Array.isArray(v) ? v : v ? [v] : []) if (item) q.append(k, item);
  }
  return q.toString();
}

export default async function EmpresasPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser();
  const sp = await searchParams;
  const filter = filterFromParams(sp);
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const [facets, page, total] = await Promise.all([getFacets(), searchCompanies(filter, cursor), countCompanies(filter)]);
  const query = filterQuery(sp);
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]) ?? "";
  const sizes = new Set(filter.sizes ?? []);
  const ufs = new Set(filter.ufs ?? []);
  const cities = facets.municipalities.filter((m) => !ufs.size || ufs.has(m.uf));

  return (
    <>
      <PageHeader
        index="03B"
        title="Empresas"
        description="Busque na base da Receita Federal por atividade, região, porte e capital. Salve o resultado como lista para exportar."
      />

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <Glass className="h-fit p-5 xl:sticky xl:top-24">
          <form method="get" className="space-y-4">
            <label className="block text-sm font-medium">
              Nome ou CNPJ
              <span className="relative block">
                <Search size={16} aria-hidden className="absolute left-4 top-1/2 mt-1 -translate-y-1/2 opacity-50" />
                <input name="q" type="search" defaultValue={one("q")} maxLength={80} className={`${field} pl-11`} />
              </span>
            </label>
            <label className="block text-sm font-medium">
              Atividade (CNAE principal)
              <select name="cnae" defaultValue={filter.cnaes?.[0] ?? ""} className={field}>
                <option value="">Todas</option>
                {facets.cnaes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {formatCnae(c.code)} · {c.description} ({c.count.toLocaleString("pt-BR")})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-[96px_1fr] gap-3">
              <label className="block text-sm font-medium">
                UF
                <select name="uf" defaultValue={filter.ufs?.[0] ?? ""} className={field}>
                  <option value="">Todas</option>
                  {facets.ufs.map((u) => (
                    <option key={u.code} value={u.code}>
                      {u.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Município
                <select name="municipio" defaultValue={filter.municipalities?.[0] ?? ""} className={field}>
                  <option value="">Todos</option>
                  {cities.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.name} ({m.count.toLocaleString("pt-BR")})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Porte</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {(["ME", "EPP", "DEMAIS"] as const).map((s) => (
                  <label key={s} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-night/10 bg-white/70 px-4 text-sm has-[:checked]:border-night has-[:checked]:bg-night has-[:checked]:text-white">
                    <input type="checkbox" name="porte" value={s} defaultChecked={sizes.has(s)} className="sr-only" />
                    {SIZE_LABEL[s]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-medium">
              Capital social
              <select name="capital_min" defaultValue={one("capital_min")} className={field}>
                {CAPITALS.map((c) => (
                  <option key={c.v} value={c.v}>
                    {c.l}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-2 text-sm">
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" name="tem_email" value="1" defaultChecked={filter.has_email} className="size-5 accent-night" />
                Só com e-mail
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input type="checkbox" name="matriz" value="1" defaultChecked={filter.headquarters_only} className="size-5 accent-night" />
                Só matrizes
              </label>
            </div>
            <div className="flex flex-wrap gap-3 pt-1">
              <button type="submit" className="min-h-12 cursor-pointer rounded-full bg-night px-6 text-sm font-medium text-white hover:-translate-y-0.5">
                Buscar
              </button>
              <Link href="/empresas" className="flex min-h-12 items-center rounded-full border border-night/15 bg-white/60 px-6 text-sm">
                Limpar
              </Link>
            </div>
          </form>
        </Glass>

        <div className="min-w-0 space-y-4">
          <Glass className="p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-4xl font-light tracking-[-0.05em] tabular-nums">
                {total.toLocaleString("pt-BR")} <span className="text-base tracking-normal opacity-60">empresas</span>
              </p>
              <Micro>Ordenadas por capital social</Micro>
            </div>
            <div className="mt-4">
              <SaveListForm query={query} total={total} />
            </div>
          </Glass>

          <Glass className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <caption className="sr-only">Empresas encontradas</caption>
                <thead>
                  <tr className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
                    <th scope="col" className="px-6 py-4 font-normal">Empresa</th>
                    <th scope="col" className="px-4 py-4 font-normal">Local</th>
                    <th scope="col" className="px-4 py-4 font-normal">Porte</th>
                    <th scope="col" className="px-4 py-4 text-right font-normal">Capital</th>
                    <th scope="col" className="px-4 py-4 font-normal">Contato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-night/10 border-t border-night/10">
                  {page.items.map((c) => (
                    <tr key={c.cnpj} className="transition-colors hover:bg-white/60">
                      <td className="px-6 py-4">
                        <Link href={`/empresas/${c.cnpj}`} className="block font-medium tracking-[-0.01em] underline-offset-4 hover:underline">
                          {c.name}
                        </Link>
                        <span className="block font-mono text-[11px] opacity-55">
                          {formatCnpj(c.cnpj)}
                          {!c.isHeadquarters && " · filial"}
                        </span>
                      </td>
                      <td className="px-4 py-4 opacity-70">{[c.city, c.uf].filter(Boolean).join(", ") || "—"}</td>
                      <td className="px-4 py-4 opacity-70">{SIZE_LABEL[c.size] ?? "—"}</td>
                      <td className="px-4 py-4 text-right font-mono text-xs tabular-nums">{formatMoney(c.shareCapital)}</td>
                      <td className="px-4 py-4">
                        <span className="flex gap-2 opacity-70">
                          {c.email && <Mail size={15} aria-label="Tem e-mail" />}
                          {c.phones.length > 0 && <Phone size={15} aria-label="Tem telefone" />}
                          {!c.email && !c.phones.length && "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {page.items.length === 0 && (
              <p className="px-5 py-14 text-center text-sm opacity-60">
                Nenhuma empresa encontrada com esses filtros. Tente afrouxar o capital ou o porte.
              </p>
            )}
            {(cursor || page.nextCursor) && (
              <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3 border-t border-night/10 p-4">
                {cursor ? (
                  <Link href={`/empresas?${query}`} className="flex min-h-11 items-center rounded-full border border-night/15 bg-white/60 px-5 text-sm">
                    Primeira página
                  </Link>
                ) : (
                  <span />
                )}
                {page.nextCursor && (
                  <Link
                    href={`/empresas?${query}${query ? "&" : ""}cursor=${page.nextCursor}`}
                    className="flex min-h-11 items-center rounded-full bg-night px-5 text-sm font-medium text-white"
                  >
                    Próximas 50
                  </Link>
                )}
              </nav>
            )}
          </Glass>
        </div>
      </div>
    </>
  );
}
