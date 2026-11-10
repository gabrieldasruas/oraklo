import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { urlDoApp } from "./email";

// Link de descadastro dos e-mails: /sair?l=<lead>&t=<assinatura>. A assinatura impede que alguém
// descadastre leads alheios trocando o id. Segredo próprio ou, na falta, a chave de serviço.

const segredo = () => process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-oraklo";
const hmac = (texto: string) => createHmac("sha256", segredo()).update(texto).digest("base64url").slice(0, 32);
const assinar = (leadId: string) => hmac(`sair:${leadId}`);

const igual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Assinatura do link de confirmação da página pública /remover-dados. */
export const assinarPedido = (pedidoId: string) => hmac(`remover:${pedidoId}`);
export const pedidoValido = (pedidoId: string, token: string) => igual(assinarPedido(pedidoId), token);

export const linkDescadastro = (leadId: string) => `${urlDoApp()}/sair?l=${leadId}&t=${assinar(leadId)}`;

export const tokenValido = (leadId: string, token: string) => igual(assinar(leadId), token);

/** Rodapé que vai em todo e-mail enviado pela plataforma. */
export const rodapeDescadastro = (leadId: string) => `\n\n—\nNão quer mais receber estes e-mails? ${linkDescadastro(leadId)}`;
