import type { Metadata } from "next";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import RelatorioView from "@/components/relatorios/RelatorioView";
import Exportar from "@/components/relatorios/Exportar";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { lerPeriodo, montarRelatorio } from "@/lib/relatorios";

export const metadata: Metadata = { title: `Relatórios — ${site.name}` };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function RelatoriosPage({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const periodo = lerPeriodo(sp);
  const relatorio = await montarRelatorio(await createClient(), periodo);
  const query = new URLSearchParams({ periodo: periodo.chave, de: periodo.de, ate: periodo.ate }).toString();

  return (
    <>
      <PageHeader
        index="05"
        title="Relatórios"
        description="Desempenho real da sua prospecção: funil, e-mails, segmentos e se o score está acertando."
        action={<Exportar query={query} />}
      />
      <RelatorioView r={relatorio} />
    </>
  );
}
