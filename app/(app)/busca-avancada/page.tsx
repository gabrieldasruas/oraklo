import type { Metadata } from "next";
import { site } from "@/content/site";
import { requireUser } from "@/lib/auth";
import { getFacets } from "@/lib/companies";
import PageHeader from "@/components/app/PageHeader";
import BuscaAvancada from "@/components/busca/BuscaAvancada";
import { carregarPerfil } from "../segmentacao/perfil";

export const metadata: Metadata = { title: `Busca avançada — ${site.name}` };

type Props = { searchParams: Promise<{ produto?: string; cnaes?: string }> };

export default async function BuscaAvancadaPage({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  // veio do Catálogo: "Quem compra o que eu vendo"
  const cnaesProduto = (sp.cnaes ?? "").split(",").filter((c) => /^\d{7}$/.test(c)).slice(0, 30);
  const vendendo = cnaesProduto.length ? { produto: (sp.produto ?? "seu produto").slice(0, 80), cnaes: cnaesProduto } : null;
  const [facets, perfil] = await Promise.all([getFacets(), carregarPerfil().catch(() => null)]);
  return (
    <>
      <PageHeader
        index="05"
        title="Busca avançada"
        description="Desenhe um raio no mapa e encontre as empresas da atividade (CNAE) que você quer, só dentro daquela região do Brasil."
      />
      <BuscaAvancada cnaes={facets.cnaes} ufsComDados={Object.fromEntries(facets.ufs.map((u) => [u.code, u.count]))} perfil={perfil} vendendo={vendendo} />
    </>
  );
}
