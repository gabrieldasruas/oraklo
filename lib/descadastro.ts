import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { urlDoApp } from "./email";

// Link de descadastro dos e-mails: /sair?l=<lead>&t=<assinatura>. A assinatura impede que alguém
// descadastre leads alheios trocando o id. Segredo próprio ou, na falta, a chave de serviço.

const segredo = () => process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-oraklo";
const assinar = (leadId: string) => createHmac("sha256", segredo()).update(`sair:${leadId}`).digest("base64url").slice(0, 32);

export const linkDescadastro = (leadId: string) => `${urlDoApp()}/sair?l=${leadId}&t=${assinar(leadId)}`;

export function tokenValido(leadId: string, token: string) {
  const a = Buffer.from(assinar(leadId));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Rodapé que vai em todo e-mail enviado pela plataforma. */
export const rodapeDescadastro = (leadId: string) => `\n\n—\nNão quer mais receber estes e-mails? ${linkDescadastro(leadId)}`;
