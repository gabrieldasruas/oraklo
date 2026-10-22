import { createAdminClient } from "@/lib/db/admin";
import { emailConfigurado, enviarLote } from "@/lib/email";

// Cron da Vercel (vercel.json): envia os follow-ups vencidos para quem ainda não respondeu.
// A Vercel manda "Authorization: Bearer $CRON_SECRET". Sem CRON_SECRET a rota fica fechada.

export const dynamic = "force-dynamic";

type Ev = { id: number; lead_id: string; workspace_id: string; type: string; payload: Record<string, unknown> | null; created_at: string };
type Follow = { at: string; subject: string; body: string };

const PARAM = new Set(["Respondeu", "Reunião marcada", "Sem interesse"]);

export async function GET(req: Request) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || req.headers.get("authorization") !== `Bearer ${segredo}`) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (!emailConfigurado()) return Response.json({ enviados: 0, motivo: "e-mail não configurado" });

  const db = createAdminClient();
  const desde = new Date(Date.now() - 45 * 86_400_000).toISOString();
  const { data, error } = await db
    .from("lead_events")
    .select("id, lead_id, workspace_id, type, payload, created_at")
    .in("type", ["email_sent", "email_replied", "email_bounced"])
    .gte("created_at", desde)
    .order("created_at", { ascending: true })
    .limit(20000);
  if (error) return Response.json({ error: "Falha ao ler eventos" }, { status: 500 });
  const eventos = (data ?? []) as Ev[];

  const agora = Date.now();
  const jaFeitos = new Set(eventos.filter((e) => e.type === "email_sent" && e.payload?.parentId).map((e) => Number(e.payload!.parentId)));
  const parados = new Map<string, number>(); // lead → momento da resposta/devolução
  for (const e of eventos) if (e.type !== "email_sent") parados.set(e.lead_id, new Date(e.created_at).getTime());

  const vencidos = eventos.filter((e) => {
    if (e.type !== "email_sent" || Number(e.payload?.step) !== 1 || jaFeitos.has(e.id)) return false;
    const f = e.payload?.followup as Follow | null | undefined;
    if (!f?.at || !f.body || new Date(f.at).getTime() > agora) return false;
    const parou = parados.get(e.lead_id);
    return !(parou && parou >= new Date(e.created_at).getTime());
  });
  if (!vencidos.length) return Response.json({ enviados: 0 });

  // só quem ainda está em aberto no funil
  const { data: leads } = await db.from("leads").select("id, status").in("id", [...new Set(vencidos.map((e) => e.lead_id))]);
  const status = new Map((leads ?? []).map((l) => [l.id as string, l.status as string]));
  const enviar = vencidos.filter((e) => status.has(e.lead_id) && !PARAM.has(status.get(e.lead_id)!)).slice(0, 300);

  const msgs = enviar.map((e) => {
    const f = e.payload!.followup as Follow;
    return { para: String(e.payload!.to), assunto: f.subject, texto: f.body, responderPara: String(e.payload!.replyTo ?? "") || undefined, tags: { lead: e.lead_id } };
  });
  const ids = msgs.length ? await enviarLote(msgs) : [];

  const novos = enviar.flatMap((e, i) =>
    ids[i]
      ? [
          {
            lead_id: e.lead_id,
            workspace_id: e.workspace_id,
            type: "email_sent",
            payload: { providerId: ids[i], to: msgs[i].para, subject: msgs[i].assunto, body: msgs[i].texto.slice(0, 4000), step: 2, parentId: e.id, replyTo: e.payload!.replyTo ?? null, followup: null },
          },
        ]
      : [],
  );
  if (novos.length) await db.from("lead_events").insert(novos);
  return Response.json({ enviados: novos.length, falharam: enviar.length - novos.length });
}
