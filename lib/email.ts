import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Envio de e-mail pela Resend (https://resend.com). Fica desligado até existirem
// RESEND_API_KEY e EMAIL_FROM (ex.: "Oraklo <contato@seudominio.com.br>") nas variáveis da Vercel.

export const emailConfigurado = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export type Mensagem = { para: string; assunto: string; texto: string; responderPara?: string; tags?: Record<string, string> };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Texto puro → HTML simples (links clicáveis, quebras de linha). */
export function textoParaHtml(texto: string) {
  const corpo = esc(texto)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0b0b0c">$1</a>')
    .replace(/\n/g, "<br>");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#0b0b0c">${corpo}</div>`;
}

/** Envia até 100 mensagens numa chamada. Devolve o id da Resend de cada uma (ou null se falhou). */
export async function enviarLote(msgs: Mensagem[]): Promise<(string | null)[]> {
  if (!emailConfigurado()) throw new Error("Envio de e-mail não configurado");
  const out: (string | null)[] = [];
  for (let i = 0; i < msgs.length; i += 100) {
    const lote = msgs.slice(i, i + 100);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(
        lote.map((m) => ({
          from: process.env.EMAIL_FROM,
          to: [m.para],
          subject: m.assunto,
          text: m.texto,
          html: textoParaHtml(m.texto),
          ...(m.responderPara ? { reply_to: m.responderPara } : {}),
          ...(m.tags ? { tags: Object.entries(m.tags).map(([name, value]) => ({ name, value: value.replace(/[^\w-]/g, "_") })) } : {}),
        })),
      ),
    });
    if (!res.ok) {
      out.push(...lote.map(() => null));
      continue;
    }
    const json = (await res.json().catch(() => null)) as { data?: { id: string }[] } | null;
    out.push(...lote.map((_, j) => json?.data?.[j]?.id ?? null));
  }
  return out;
}

/**
 * Confere a assinatura do webhook da Resend (formato Svix):
 * cabeçalhos svix-id, svix-timestamp e svix-signature ("v1,<base64>"), segredo "whsec_<base64>".
 */
export function webhookValido(corpo: string, h: Headers) {
  const segredo = process.env.RESEND_WEBHOOK_SECRET;
  const id = h.get("svix-id");
  const ts = h.get("svix-timestamp");
  const assinaturas = h.get("svix-signature");
  if (!segredo || !id || !ts || !assinaturas) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 5 * 60) return false;
  const chave = Buffer.from(segredo.replace(/^whsec_/, ""), "base64");
  const esperado = createHmac("sha256", chave).update(`${id}.${ts}.${corpo}`).digest();
  return assinaturas.split(" ").some((a) => {
    const [, valor] = a.split(",");
    if (!valor) return false;
    const recebido = Buffer.from(valor, "base64");
    return recebido.length === esperado.length && timingSafeEqual(recebido, esperado);
  });
}

/** Endereço público do app (para links no e-mail). */
export function urlDoApp() {
  const u = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return u.replace(/\/$/, "");
}
