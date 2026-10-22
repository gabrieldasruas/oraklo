// Consulta pública de empresas (páginas abertas, para o Google): slugs e máscaras de contato.

export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export const slugCidade = (nome: string, uf: string) =>
  `${semAcento(nome)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${uf.toLowerCase()}`;

/** "comercial@empresa.com.br" → "c••••@empresa.com.br" (o domínio é público no site da empresa). */
export function mascararEmail(email: string | null) {
  if (!email || !email.includes("@")) return null;
  const [local, dominio] = email.toLowerCase().split("@");
  return `${local.slice(0, 1)}••••@${dominio}`;
}

/** "(47) 99123-4567" → "(47) 9••••-••67". */
export function mascararTelefone(tel: string) {
  const d = tel.replace(/\D/g, "");
  if (d.length < 10) return null;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)}••••-••${d.slice(-2)}`;
}
