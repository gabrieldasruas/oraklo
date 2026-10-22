"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/db/admin";
import { tokenValido } from "@/lib/descadastro";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Confirma o descadastro: para os e-mails e marca o lead como sem interesse. */
export async function confirmarDescadastro(form: FormData) {
  const l = String(form.get("l") ?? "");
  const t = String(form.get("t") ?? "");
  if (!UUID.test(l) || !tokenValido(l, t)) redirect("/sair?erro=1");
  const db = createAdminClient();
  const { data: lead } = await db.from("leads").select("id, workspace_id").eq("id", l).maybeSingle();
  if (lead) {
    const { data: ja } = await db.from("lead_events").select("id").eq("lead_id", l).eq("type", "email_unsubscribed").limit(1);
    if (!ja?.length) {
      await db.from("leads").update({ status: "Sem interesse" }).eq("id", l);
      await db.from("lead_events").insert([
        { lead_id: l, workspace_id: lead.workspace_id, type: "email_unsubscribed", payload: {}, created_by: null },
        { lead_id: l, workspace_id: lead.workspace_id, type: "status_changed", payload: { status: "Sem interesse" }, created_by: null },
      ]);
    }
  }
  redirect("/sair?ok=1");
}
