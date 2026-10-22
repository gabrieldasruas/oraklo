import type { Metadata } from "next";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import ConfiguracoesView from "@/components/app/ConfiguracoesView";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { LIMITES, NOME_PLANO, planoDoWorkspace, usoDoMes } from "@/lib/planos";
import { carregarConfig } from "./actions";

export const metadata: Metadata = { title: `Configurações — ${site.name}` };

export default async function ConfiguracoesPage() {
  const user = await requireUser();
  const db = await createClient();
  const [config, plano, uso, { data: membros }] = await Promise.all([
    carregarConfig(),
    planoDoWorkspace(db, user.workspaceId),
    usoDoMes(db),
    db.from("members").select("user_id, role").eq("workspace_id", user.workspaceId),
  ]);
  return (
    <>
      <PageHeader index="07" title="Configurações" description="Seu perfil, plano, assinatura de e-mail, integração com CRM e modelos de WhatsApp." />
      <ConfiguracoesView
        inicial={config}
        usuario={{ nome: user.name, email: user.email, workspace: user.workspaceName }}
        plano={{ id: plano, nome: NOME_PLANO[plano], limites: LIMITES[plano], uso }}
        membros={(membros ?? []).length}
        emailContato={site.email}
      />
    </>
  );
}
