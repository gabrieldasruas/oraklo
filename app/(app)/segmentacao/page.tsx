import type { Metadata } from "next";
import { site } from "@/content/site";
import { getNiches } from "@/lib/niches";
import PageHeader from "@/components/app/PageHeader";
import SegmentExplorer from "@/components/app/SegmentExplorer";

export const metadata: Metadata = { title: `Segmentação — ${site.name}` };

export default async function SegmentacaoPage() {
  const niches = await getNiches();
  return (
    <>
      <PageHeader
        index="03"
        title="Segmentação"
        description="Gire o anel para explorar os nichos de prospecção e passe o mouse sobre um deles para pré-visualizar os possíveis clientes."
      />
      <SegmentExplorer niches={niches} />
    </>
  );
}
