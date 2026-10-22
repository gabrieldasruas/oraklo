import type { Metadata } from "next";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import RelatorioView from "@/components/relatorios/RelatorioView";
import Exportar from "@/components/relatorios/Exportar";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { lerPeriodo, montarRelatorio } from "@/lib/relatorios";
import { LIMITES, planoDoWorkspace } from "@/lib/planos";

export const metadata: Metadata = { title: `Relatórios — ${site.name}` };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function RelatoriosPage({ searchParams }: Props) {
  const user = await requireUser();
  const sp = await searchParams;
  const periodo = lerPeriodo(sp);
  const db = await createClient();
  const [relatorio, plano] = await Promise.all([montarRelatorio(db, periodo), planoDoWorkspace(db, user.workspaceId)]);
  const completo = LIMITES[plano].relatoriosCompletos;
  const query = new URLSearchParams({ periodo: periodo.chave, de: periodo.de, ate: periodo.ate }).toString();

  return (
    <>
      <PageHeader
        index="05"
        title="Relatórios"
        description="Desempenho real da sua prospecção: funil, e-mails, segmentos e se o score está acertando."
        action={completo ? <Exportar query={query} /> : undefined}
      />
      <RelatorioView r={relatorio} completo={completo} />
    </>
  );
}
