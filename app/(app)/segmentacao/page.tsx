import type { Metadata } from "next";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import SegmentExplorer from "@/components/app/SegmentExplorer";

export const metadata: Metadata = { title: `Segmentação — ${site.name}` };

export default function SegmentacaoPage() {
  return (
    <>
      <PageHeader
        index="03"
        title="Segmentação"
        description="Gire o anel para explorar os nichos de prospecção e passe o mouse sobre um deles para pré-visualizar os possíveis clientes."
      />
      <SegmentExplorer />
    </>
  );
}
