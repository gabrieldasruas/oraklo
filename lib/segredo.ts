import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Cifra tokens de integração (RD Station etc.) antes de gravar no banco. AES-256-GCM com chave
// derivada de um segredo do servidor; quem lê o banco sem esse segredo não consegue usar o token.

const chave = () => createHash("sha256").update(process.env.CRM_SECRET || process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-oraklo").digest();

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const dados = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), dados].map((b) => b.toString("base64url")).join(".");
}

export function decifrar(cifrado: string): string | null {
  try {
    const [iv, tag, dados] = cifrado.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = createDecipheriv("aes-256-gcm", chave(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(dados), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}
