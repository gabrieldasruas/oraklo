import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import { Aura, Glass, Micro, Pill, WireArt } from "@/components/app/ui";
import { getFacets, searchCompanies } from "@/lib/companies";
import { formatCnpj, formatMoney, SIZE_LABEL } from "@/lib/format";
import { slugCidade } from "@/lib/consulta";

export const metadata: Metadata = {
  title: `Consulta de empresas por CNPJ e cidade — ${site.name}`,
  description: "Consulte empresas pelo nome ou CNPJ, por cidade e atividade, com porte, capital social e endereço. Dados públicos da Receita Federal.",
  alternates: { canonical: "/consulta" },
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function ConsultaPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const termo = q.trim().slice(0, 80);
  // CNPJ completo → vai direto para a página da empresa
  if (/^\d{14}$/.test(termo.replace(/\D/g, "")) && termo.replace(/\D/g, "").length === 14) redirect(`/cnpj/${termo.replace(/\D/g, "")}`);

  const facets = await getFacets();
  const cidades = [...facets.municipalities].sort((a, b) => b.count - a.count);
  const resultados = termo.length >= 3 ? (await searchCompanies({ q: /^[\d./-]+$/.test(termo) ? termo.replace(/\D/g, "") : termo }, undefined, 20)).items : null;
  const total = facets.ufs.reduce((s, u) => s + u.count, 0);

  return (
    <>
      <PageHeader
        index="12"
        title="Consulta de empresas"
        description="Encontre empresas pelo nome ou CNPJ e veja porte, capital social, atividade e endereço. Dados públicos da Receita Federal."
        action={<Pill href="/entrar">Criar conta grátis</Pill>}
      />

      <Glass className="p-5 md:p-6">
        <form action="/consulta" className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Nome ou CNPJ</span>
            <Search size={18} aria-hidden className="absolute left-5 top-1/2 -translate-y-1/2 opacity-45" />
            <input name="q" defaultValue={termo} placeholder="Nome da empresa ou CNPJ" className="min-h-14 w-full rounded-full border border-night/10 bg-white/80 pl-13 pr-5 text-base outline-none focus:border-night/30" style={{ paddingLeft: "3.25rem" }} />
          </label>
          <button type="submit" className="min-h-14 cursor-pointer rounded-full bg-night px-8 text-sm font-medium text-white hover:bg-neon hover:text-night">
            Consultar
          </button>
        </form>
        <p className="mt-3 px-2 text-xs opacity-55">{total.toLocaleString("pt-BR")} empresas ativas na base · hoje cobrimos {facets.ufs.map((u) => u.code).join(", ")}</p>
      </Glass>

      {resultados && (
        <Glass className="mt-4 overflow-hidden">
          <p className="border-b border-night/10 px-6 py-4 text-sm">
            {resultados.length ? `Resultados para “${termo}”` : `Nada encontrado para “${termo}”.`}
          </p>
          <ul className="divide-y divide-night/10">
            {resultados.map((c) => (
              <li key={c.cnpj}>
                <Link href={`/cnpj/${c.cnpj}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-white/60">
                  <span className="min-w-0">
                    <span className="block font-medium">{c.name}</span>
                    <span className="block font-mono text-[10px] uppercase tracking-widest opacity-50">
                      {formatCnpj(c.cnpj)} · {c.city}/{c.uf} · {SIZE_LABEL[c.size] ?? "—"}
                    </span>
                  </span>
                  <span className="font-mono text-xs">{formatMoney(c.shareCapital)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Glass>
      )}

      <Micro className="mb-3 mt-10 px-1">Empresas por cidade</Micro>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {cidades.slice(0, 60).map((m) => (
          <Link key={m.code} href={`/consulta/${slugCidade(m.name, m.uf)}`} className="group flex items-center justify-between gap-3 rounded-[20px] border border-white/80 bg-white/60 px-4 py-3 hover:bg-white">
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{m.name}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">
                {m.uf} · {m.count.toLocaleString("pt-BR")} empresas
              </span>
            </span>
            <ArrowUpRight size={15} aria-hidden className="shrink-0 opacity-40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      <Aura tone="night" className="relative mt-10 p-8 md:p-12">
        <WireArt kind="orbit" spin className="absolute -right-20 -top-24 size-96 text-neon opacity-25" />
        <Micro className="relative !opacity-60">Para quem vende para empresas</Micro>
        <h2 className="relative mt-3 max-w-2xl text-4xl font-medium leading-[1] tracking-[-0.045em] md:text-5xl">Veja os contatos, filtre no mapa e saiba quem abordar primeiro.</h2>
        <p className="relative mt-4 max-w-xl text-sm text-white/60">Com uma conta grátis você vê e-mail e telefone, busca por raio no mapa, recebe um score de 0 a 100 por empresa e organiza tudo num CRM.</p>
        <div className="relative mt-8">
          <Pill href="/entrar" tone="neon">
            Criar conta grátis
          </Pill>
        </div>
      </Aura>
    </>
  );
}
