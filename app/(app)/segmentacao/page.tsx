import type { Metadata } from "next";
import { site } from "@/content/site";
import { getNiches } from "@/lib/niches";
import PageHeader from "@/components/app/PageHeader";
import SegmentExplorer from "@/components/app/SegmentExplorer";
import FocoNichos from "@/components/segmentacao/FocoNichos";
import VitrinePerfil from "@/components/segmentacao/VitrinePerfil";
import { carregarPerfil } from "./perfil";

export const metadata: Metadata = { title: `Segmentação — ${site.name}` };

export default async function SegmentacaoPage() {
  const [niches, perfil] = await Promise.all([getNiches(), carregarPerfil()]);
  return (
    <>
      <PageHeader
        index="03"
        title="Segmentação"
        description="Gire o anel para explorar os nichos, escolha os que você quer focar e ensine à busca como é o seu cliente ideal."
      />
      <SegmentExplorer
        niches={niches}
        abaixoDoAnel={<VitrinePerfil perfil={perfil} nomesNichos={niches.filter((n) => perfil.nichos.includes(n.id)).map((n) => n.name)} />}
      />
      <FocoNichos niches={niches} inicial={perfil} />
    </>
  );
}
