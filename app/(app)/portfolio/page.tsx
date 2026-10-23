import type { Metadata } from "next";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import PortfolioStudio from "@/components/portfolio/PortfolioStudio";
import Catalogo from "@/components/catalogo/Catalogo";
import SeletorPortfolio from "@/components/portfolio/SeletorPortfolio";
import { unirCompradores } from "@/lib/produtos";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { getFacets } from "@/lib/companies";
import { iaConfigurada } from "@/lib/ia";
import { LIMITES, NOME_PLANO, planoDoWorkspace } from "@/lib/planos";
import { carregarPortfolio, listarArquivos } from "./actions";
import { listarProdutos } from "./produtos";
import { PORTFOLIO_TAG } from "@/lib/portfolio-types";

export const metadata: Metadata = { title: `Portfólio — ${site.name}` };

type Props = { searchParams: Promise<{ aba?: string }> };

/** Números dos dois cartões de escolha (produtos, compradores, soluções...). */
async function resumo() {
  const [produtos, facets, portfolio] = await Promise.all([listarProdutos(), getFacets().catch(() => null), carregarPortfolio()]);
  const contagem = new Map((facets?.cnaes ?? []).map((c) => [c.code, c.count]));
  return {
    produtos: produtos.length,
    compradores: unirCompradores(produtos).reduce((s, c) => s + (contagem.get(c.code) ?? 0), 0),
    solucoes: portfolio.solucoes.length,
    cases: portfolio.cases.length,
    linkAtivo: !!portfolio.compartilhar?.ativo,
  };
}

export default async function PortfolioPage({ searchParams }: Props) {
  const { aba } = await searchParams;
  const catalogo = aba === "catalogo";

  return (
    <>
      <PageHeader
        index="06"
        title="Portfólio"
        description={
          catalogo
            ? "Seus produtos com preço e quem compra cada um. Do catálogo ao mapa de compradores e à oferta pronta, em três passos."
            : "Monte sua apresentação para empresas: identidade, soluções e cases. Vira slides prontos em PDF e o e-mail de apresentação de cada lead."
        }
      />

      <SeletorPortfolio aba={catalogo ? "catalogo" : "apresentacao"} resumo={await resumo()} />

      {catalogo ? <CatalogoPagina /> : <Apresentacao />}
    </>
  );
}

async function Apresentacao() {
  const [portfolio, arquivos] = await Promise.all([carregarPortfolio(), listarArquivos()]);
  return <PortfolioStudio inicial={portfolio} arquivosIniciais={arquivos} />;
}

async function CatalogoPagina() {
  const user = await requireUser();
  const db = await createClient();
  const [produtos, plano, facets, portfolio, { data: linha }] = await Promise.all([
    listarProdutos(),
    planoDoWorkspace(db, user.workspaceId),
    getFacets().catch(() => null),
    carregarPortfolio(),
    db.from("lists").select("id").eq("tag", PORTFOLIO_TAG).order("created_at").limit(1).maybeSingle(),
  ]);
  const id = portfolio.identidade;
  return (
    <Catalogo
      inicial={produtos}
      limite={LIMITES[plano].produtos}
      plano={NOME_PLANO[plano]}
      atividades={facets?.cnaes ?? []}
      iaLigada={iaConfigurada()}
      remetente={{ nome: id.nome === "Seu nome" ? user.name : id.nome, empresa: id.empresa === "Sua empresa" ? user.workspaceName : id.empresa }}
      temLink={!!portfolio.compartilhar?.ativo}
      linkPublico={portfolio.compartilhar?.ativo && linha ? `/p/${linha.id}#produtos` : null}
    />
  );
}
