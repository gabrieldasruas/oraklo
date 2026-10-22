import type { Metadata } from "next";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import PortfolioStudio from "@/components/portfolio/PortfolioStudio";
import { carregarPortfolio, listarArquivos } from "./actions";

export const metadata: Metadata = { title: `Portfólio — ${site.name}` };

export default async function PortfolioPage() {
  const [portfolio, arquivos] = await Promise.all([carregarPortfolio(), listarArquivos()]);
  return (
    <>
      <PageHeader
        index="06"
        title="Portfólio"
        description="Monte sua apresentação para empresas: identidade, soluções e cases. Vira slides prontos em PDF e o e-mail de apresentação de cada lead."
      />
      <PortfolioStudio inicial={portfolio} arquivosIniciais={arquivos} />
    </>
  );
}
