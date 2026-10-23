import type { Metadata } from "next";
import { site } from "@/content/site";
import type { Niche } from "@/content/app";
import { getNiches } from "@/lib/niches";
import { CNAES_DO_NICHO, type PerfilBusca } from "@/lib/perfil-busca";
import PageHeader from "@/components/app/PageHeader";
import SegmentExplorer from "@/components/app/SegmentExplorer";
import FocoNichos from "@/components/segmentacao/FocoNichos";
import VitrinePerfil from "@/components/segmentacao/VitrinePerfil";
import { carregarPerfil } from "./perfil";
import { getFacets } from "@/lib/companies";

export const metadata: Metadata = { title: `Segmentação — ${site.name}` };

type Cnae = { code: string; description: string; count: number };

/** Só os segmentos que o cliente escolheu, com números reais da base (nada de exemplo). */
function segmentosDoPerfil(niches: Niche[], perfil: PerfilBusca, cnaes: Cnae[]): Niche[] {
  const contagem = new Map(cnaes.map((c) => [c.code, c.count]));
  const somar = (codes: string[]) => codes.reduce((s, c) => s + (contagem.get(c) ?? 0), 0);

  const nichos = perfil.nichos.flatMap((id) => {
    const n = niches.find((x) => x.id === id);
    if (!n) return [];
    if (!n.preview) return [n];
    // nicho ainda não importado: mantém nome e descrição, troca os números de exemplo pelos da base
    return [{ ...n, region: "Santa Catarina", companies: somar(CNAES_DO_NICHO[n.id] ?? []), contacts: 0, score: null, samples: [], tags: [] }];
  });

  const atividades = perfil.atividades.map(
    (a): Niche => ({
      id: `cnae-${a.code}`,
      group: "Atividades (CNAE)",
      icon: "",
      name: a.descricao,
      region: "Santa Catarina",
      description: `Empresas com a atividade CNAE ${a.code} na base do Oraklo.`,
      companies: contagem.get(a.code) ?? 0,
      contacts: 0,
      score: null,
      roles: [],
      samples: [],
      tags: [],
      atividade: true,
    }),
  );
  return [...nichos, ...atividades];
}

export default async function SegmentacaoPage() {
  const [niches, perfil, facets] = await Promise.all([getNiches(), carregarPerfil(), getFacets().catch(() => null)]);
  const cnaes = facets?.cnaes ?? [];
  const segmentos = segmentosDoPerfil(niches, perfil, cnaes);
  return (
    <>
      <PageHeader
        index="03"
        title="Segmentação"
        description="Escolha os nichos e atividades que você quer focar. Eles aparecem no anel com o número real de empresas da base."
      />
      <SegmentExplorer
        key={segmentos.map((s) => s.id).join("|")}
        niches={segmentos}
        acimaDoAnel={<VitrinePerfil perfil={perfil} nomesNichos={segmentos.map((s) => s.name)} />}
      />
      <FocoNichos niches={niches} inicial={perfil} atividades={cnaes} />
    </>
  );
}
