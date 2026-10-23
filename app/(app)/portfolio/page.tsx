import type { Metadata } from "next";
import Link from "next/link";
import { LayoutTemplate, ShoppingBag } from "lucide-react";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import PortfolioStudio from "@/components/portfolio/PortfolioStudio";
import Catalogo from "@/components/catalogo/Catalogo";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { getFacets } from "@/lib/companies";
import { iaConfigurada } from "@/lib/ia";
import { LIMITES, NOME_PLANO, planoDoWorkspace } from "@/lib/planos";
import { carregarPortfolio, listarArquivos } from "./actions";
import { listarProdutos } from "./produtos";

export const metadata: Metadata = { title: `Portfólio — ${site.name}` };

type Props = { searchParams: Promise<{ aba?: string }> };

const ABAS = [
  { id: "apresentacao", t: "Apresentação", d: "Slides, e-mail e link", I: LayoutTemplate },
  { id: "catalogo", t: "Catálogo", d: "Quem compra o que eu vendo", I: ShoppingBag },
] as const;

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

      <nav aria-label="Partes do portfólio" className="mb-4 flex flex-wrap gap-2">
        {ABAS.map(({ id, t, d, I }) => {
          const on = (id === "catalogo") === catalogo;
          return (
            <Link
              key={id}
              href={id === "catalogo" ? "/portfolio?aba=catalogo" : "/portfolio"}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-14 items-center gap-3 rounded-full border py-2 pl-2 pr-5 transition-colors ${on ? "border-night bg-night text-white" : "border-white/70 bg-white/55 hover:bg-white/90"}`}
            >
              <span className={`flex size-10 items-center justify-center rounded-full ${on ? "bg-neon text-night" : "bg-night/5"}`}>
                <I size={17} aria-hidden />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-sm font-medium">{t}</span>
                <span className={`text-[11px] ${on ? "text-white/60" : "opacity-55"}`}>{d}</span>
              </span>
            </Link>
          );
        })}
      </nav>

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
  const [produtos, plano, facets, portfolio] = await Promise.all([
    listarProdutos(),
    planoDoWorkspace(db, user.workspaceId),
    getFacets().catch(() => null),
    carregarPortfolio(),
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
    />
  );
}
