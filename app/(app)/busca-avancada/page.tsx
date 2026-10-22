import type { Metadata } from "next";
import { site } from "@/content/site";
import { requireUser } from "@/lib/auth";
import { getFacets } from "@/lib/companies";
import PageHeader from "@/components/app/PageHeader";
import BuscaAvancada from "@/components/busca/BuscaAvancada";
import { carregarPerfil } from "../segmentacao/perfil";

export const metadata: Metadata = { title: `Busca avançada — ${site.name}` };

export default async function BuscaAvancadaPage() {
  await requireUser();
  const [facets, perfil] = await Promise.all([getFacets(), carregarPerfil().catch(() => null)]);
  return (
    <>
      <PageHeader
        index="05"
        title="Busca avançada"
        description="Desenhe um raio no mapa e encontre as empresas da atividade (CNAE) que você quer, só dentro daquela região do Brasil."
      />
      <BuscaAvancada cnaes={facets.cnaes} ufsComDados={Object.fromEntries(facets.ufs.map((u) => [u.code, u.count]))} perfil={perfil} />
    </>
  );
}
