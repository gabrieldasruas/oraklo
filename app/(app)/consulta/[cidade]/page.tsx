import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import { Glass, Micro, Pill } from "@/components/app/ui";
import { countCompanies, getFacets, searchCompanies } from "@/lib/companies";
import { formatCnae, formatMoney, SIZE_LABEL } from "@/lib/format";
import { slugCidade } from "@/lib/consulta";
import { calcularScore, faixaScore } from "@/lib/score";

type Props = { params: Promise<{ cidade: string }>; searchParams: Promise<Record<string, string | undefined>> };

async function cidadeDoSlug(slug: string) {
  const facets = await getFacets();
  const m = facets.municipalities.find((x) => slugCidade(x.name, x.uf) === slug);
  return m ? { m, facets } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await cidadeDoSlug((await params).cidade);
  if (!r) return { title: `Cidade não encontrada — ${site.name}` };
  const { m } = r;
  return {
    title: `Empresas em ${m.name}/${m.uf}: ${m.count.toLocaleString("pt-BR")} CNPJs ativos — ${site.name}`,
    description: `Lista de empresas ativas em ${m.name}/${m.uf} com atividade, porte, capital social e endereço. Dados públicos da Receita Federal.`,
    alternates: { canonical: `/consulta/${(await params).cidade}` },
  };
}

export default async function CidadePage({ params, searchParams }: Props) {
  const { cidade } = await params;
  const { atividade, depois } = await searchParams;
  const r = await cidadeDoSlug(cidade);
  if (!r) notFound();
  const { m, facets } = r;
  const cnae = atividade && /^\d{7}$/.test(atividade) ? atividade : undefined;
  const filtro = { municipalities: [m.code], ...(cnae ? { cnaes: [cnae], cnae_main_only: true } : {}) };
  const [pagina, total] = await Promise.all([searchCompanies(filtro, depois, 50), countCompanies(filtro)]);
  const atividades = facets.cnaes.slice(0, 14);
  const base = `/consulta/${cidade}`;

  return (
    <>
      <PageHeader
        index="12"
        title={`Empresas em ${m.name}`}
        description={`${total.toLocaleString("pt-BR")} empresas ativas em ${m.name}/${m.uf}${cnae ? ` com a atividade ${formatCnae(cnae)}` : ""}. Ordenadas por capital social.`}
        action={<Pill href="/entrar">Ver contatos grátis</Pill>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href="/consulta" className="flex min-h-9 items-center gap-1.5 rounded-full border border-night/10 bg-white/60 px-3 text-xs hover:bg-white">
          <ArrowLeft size={12} aria-hidden /> Todas as cidades
        </Link>
        <Link href={base} className={`flex min-h-9 items-center rounded-full px-3 text-xs ${!cnae ? "bg-night text-white" : "border border-night/10 bg-white/60 hover:bg-white"}`}>
          Todas as atividades
        </Link>
        {atividades.map((a) => (
          <Link key={a.code} href={`${base}?atividade=${a.code}`} title={a.description} className={`flex min-h-9 max-w-[16rem] items-center truncate rounded-full px-3 text-xs ${cnae === a.code ? "bg-night text-white" : "border border-night/10 bg-white/60 hover:bg-white"}`}>
            <span className="truncate">{a.description}</span>
          </Link>
        ))}
      </div>

      <Glass className="overflow-hidden">
        <ul className="divide-y divide-night/10">
          {pagina.items.map((c) => {
            const f = faixaScore(calcularScore(c).score);
            return (
              <li key={c.cnpj}>
                <Link href={`/cnpj/${c.cnpj}`} className="grid items-center gap-x-4 gap-y-1 px-6 py-4 hover:bg-white/60 md:grid-cols-[1fr_auto_auto]">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="block truncate text-xs opacity-55">{[c.address, c.district].filter(Boolean).join(" · ") || `${m.name}/${m.uf}`}</span>
                  </span>
                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest opacity-70">
                    {SIZE_LABEL[c.size] ?? "—"}
                    <span className="rounded-full px-2 py-0.5 normal-case tracking-normal text-night" style={{ background: f.cor }}>
                      {f.rotulo}
                    </span>
                  </span>
                  <span className="font-mono text-xs md:text-right">{formatMoney(c.shareCapital)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        {!pagina.items.length && <p className="px-6 py-14 text-center text-sm opacity-60">Nenhuma empresa com essa atividade aqui.</p>}
        {pagina.nextCursor && (
          <div className="flex justify-center border-t border-night/10 p-4">
            <Link href={`${base}?${new URLSearchParams({ ...(cnae ? { atividade: cnae } : {}), depois: pagina.nextCursor }).toString()}`} className="flex min-h-11 items-center gap-2 rounded-full bg-night px-6 text-sm font-medium text-white">
              Próximas 50 <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        )}
      </Glass>

      <Micro className="mt-8 px-1">Quer filtrar por raio no mapa, ver e-mails e telefones e organizar a abordagem? Crie uma conta grátis.</Micro>
    </>
  );
}
