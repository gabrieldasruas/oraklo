import type { Metadata } from "next";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import IntegracoesView from "@/components/app/IntegracoesView";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { LIMITES, planoDoWorkspace } from "@/lib/planos";
import { carregarConfig } from "../configuracoes/actions";

export const metadata: Metadata = { title: `Integrar CRM — ${site.name}` };

export default async function IntegracoesPage() {
  const user = await requireUser();
  const [config, plano] = await Promise.all([carregarConfig(), planoDoWorkspace(await createClient(), user.workspaceId)]);
  return (
    <>
      <PageHeader index="09" title="Integrar CRM" description="Leve seus leads para o RD Station, Pipedrive, HubSpot ou qualquer CRM — e deixe as mensagens de WhatsApp prontas." />
      <IntegracoesView inicial={config} liberado={LIMITES[plano].integracoes} />
    </>
  );
}
