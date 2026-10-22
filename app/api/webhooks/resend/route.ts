import { createAdminClient } from "@/lib/db/admin";
import { webhookValido } from "@/lib/email";

// Webhook da Resend: aberturas, cliques e devoluções viram eventos no histórico do lead.
// Configure em Resend → Webhooks apontando para /api/webhooks/resend e copie o segredo para RESEND_WEBHOOK_SECRET.

export const dynamic = "force-dynamic";

const TIPOS: Record<string, string> = {
  "email.opened": "email_opened",
  "email.clicked": "email_clicked",
  "email.bounced": "email_bounced",
};

export async function POST(req: Request) {
  const corpo = await req.text();
  if (!webhookValido(corpo, req.headers)) return Response.json({ error: "Assinatura inválida" }, { status: 401 });

  const ev = JSON.parse(corpo) as { type?: string; data?: { email_id?: string; subject?: string; click?: { link?: string } } };
  const tipo = TIPOS[ev.type ?? ""];
  const providerId = ev.data?.email_id;
  if (!tipo || !providerId) return Response.json({ ok: true, ignorado: true });

  const db = createAdminClient();
  const { data: envio } = await db
    .from("lead_events")
    .select("lead_id, workspace_id, payload")
    .eq("type", "email_sent")
    .eq("payload->>providerId", providerId)
    .limit(1)
    .maybeSingle();
  if (!envio) return Response.json({ ok: true, ignorado: true });

  // abertura: registra só a primeira de cada e-mail
  if (tipo === "email_opened") {
    const { data: ja } = await db.from("lead_events").select("id").eq("type", "email_opened").eq("payload->>providerId", providerId).limit(1);
    if (ja?.length) return Response.json({ ok: true, repetido: true });
  }

  await db.from("lead_events").insert({
    lead_id: envio.lead_id,
    workspace_id: envio.workspace_id,
    type: tipo,
    payload: { providerId, subject: (envio.payload as { subject?: string })?.subject ?? ev.data?.subject ?? "", link: ev.data?.click?.link ?? null },
  });
  return Response.json({ ok: true });
}
