import type { Metadata } from "next";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import PacotesView from "@/components/app/PacotesView";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { planoDoWorkspace, usoDoMes } from "@/lib/planos";

export const metadata: Metadata = { title: `Pacotes — ${site.name}` };

export default async function PacotesPage() {
  const user = await getUser();
  const db = user ? await createClient() : null;
  const [plano, uso] = user && db ? await Promise.all([planoDoWorkspace(db, user.workspaceId), usoDoMes(db)]) : [null, null];
  return (
    <>
      <PageHeader index="08" title="Pacotes" description="Escolha quanto você quer prospectar: comece no Free e suba quando precisar de mais buscas, e-mails e automação." />
      <PacotesView planoAtual={plano} uso={uso} emailContato={site.email} />
    </>
  );
}
