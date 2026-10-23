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

/**
 * Todos os nichos aparecem no anel (os do foco do cliente primeiro), sempre com números reais:
 * nicho ainda não importado mostra a contagem de empresas da base pelos CNAEs dele, sem contatos,
 * índice de fit ou empresas de exemplo inventados.
 */
function segmentosDoPerfil(niches: Niche[], perfil: PerfilBusca, cnaes: Cnae[]): Niche[] {
  const contagem = new Map(cnaes.map((c) => [c.code, c.count]));
  const somar = (codes: string[]) => codes.reduce((s, c) => s + (contagem.get(c) ?? 0), 0);
  const real = (n: Niche): Niche =>
    n.preview ? { ...n, region: "Santa Catarina", companies: somar(CNAES_DO_NICHO[n.id] ?? []), contacts: 0, score: null, samples: [] } : n;

  const foco = new Set(perfil.nichos);
  const nichos = [...niches.filter((n) => foco.has(n.id)), ...niches.filter((n) => !foco.has(n.id))].map((n) => ({ ...real(n), foco: foco.has(n.id) }));

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
      foco: true,
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
        description="Gire o anel para explorar os nichos com o número real de empresas da base. Os que você escolher para focar aparecem primeiro."
      />
      <SegmentExplorer
        key={segmentos.map((s) => s.id).join("|")}
        niches={segmentos}
        acimaDoAnel={<VitrinePerfil perfil={perfil} nomesNichos={segmentos.filter((s) => s.foco).map((s) => s.name)} />}
      />
      <FocoNichos niches={niches} inicial={perfil} atividades={cnaes} />
    </>
  );
}
