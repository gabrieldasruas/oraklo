import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "./db/admin";

// Lista global de "não contatar" (LGPD), tabela `suppressions`. Vale para todos os workspaces:
// quem saiu não recebe e-mail, não entra no pipeline, não sai em exportação e some da busca.
// Só o servidor lê e grava (service role). E-mail e nome de sócio ficam só como hash.

export type Motivo = "descadastro" | "pedido_publico" | "manual";
export type Tipo = "email" | "cnpj" | "socio";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export const normalizarEmail = (e: string) => e.trim().toLowerCase();
export const hashEmail = (e: string) => sha(normalizarEmail(e));
const normalizarNome = (n: string) =>
  n
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
export const hashSocio = (cnpjRoot: string, nome: string) => sha(`${cnpjRoot}|${normalizarNome(nome)}`);

const CNPJ = /^\d{14}$/;

export type Supressoes = { email: (e?: string | null) => boolean; cnpj: (c?: string | null) => boolean };

/** Confere de uma vez quais e-mails e CNPJs estão na lista. Se a leitura falhar, lança (melhor não enviar). */
export async function supressoes(o: { emails?: (string | null | undefined)[]; cnpjs?: (string | null | undefined)[] }): Promise<Supressoes> {
  const emails = [...new Set((o.emails ?? []).filter((e): e is string => !!e?.trim()).map(hashEmail))];
  const cnpjs = [...new Set((o.cnpjs ?? []).map((c) => c?.trim() ?? "").filter((c) => CNPJ.test(c)))];
  const achados = new Set<string>();
  const valores = [...emails, ...cnpjs];
  if (valores.length) {
    const db = createAdminClient();
    for (let i = 0; i < valores.length; i += 100) {
      const { data, error } = await db.from("suppressions").select("kind, value").in("value", valores.slice(i, i + 100));
      if (error) throw new Error("Não foi possível conferir a lista de não contatar");
      for (const r of data) achados.add(`${r.kind}:${r.value}`);
    }
  }
  return {
    email: (e) => !!e?.trim() && achados.has(`email:${hashEmail(e)}`),
    cnpj: (c) => !!c && achados.has(`cnpj:${c.trim()}`),
  };
}

/** Sócios que pediram para tirar o nome da base. Recebe pares (raiz do CNPJ, nome) e devolve quem esconder. */
export async function sociosOcultos(pares: { root: string; nome: string }[]): Promise<(root: string, nome: string) => boolean> {
  const hashes = [...new Set(pares.map((p) => hashSocio(p.root, p.nome)))];
  const ocultos = new Set<string>();
  const db = hashes.length ? createAdminClient() : null;
  for (let i = 0; db && i < hashes.length; i += 100) {
    const { data, error } = await db.from("suppressions").select("value").eq("kind", "socio").in("value", hashes.slice(i, i + 100));
    if (error) throw new Error("Não foi possível conferir a lista de não contatar");
    for (const r of data) ocultos.add(r.value as string);
  }
  return (root, nome) => ocultos.size > 0 && ocultos.has(hashSocio(root, nome));
}

/** Tira as empresas removidas e apaga o e-mail de quem pediu para sair. */
export async function semSuprimidos<T extends { cnpj: string; receita_email: string | null }>(rows: T[]): Promise<T[]> {
  const lista = await supressoes({ emails: rows.map((r) => r.receita_email), cnpjs: rows.map((r) => r.cnpj) });
  return rows.filter((r) => !lista.cnpj(r.cnpj)).map((r) => (lista.email(r.receita_email) ? { ...r, receita_email: null } : r));
}

export type Item = { email: string } | { cnpj: string } | { socio: { cnpj: string; nome: string } };

/** Valor guardado em `suppressions.value` para cada tipo de pedido. */
export function chave(i: Item): { kind: Tipo; value: string } {
  if ("email" in i) return { kind: "email", value: hashEmail(i.email) };
  if ("cnpj" in i) return { kind: "cnpj", value: i.cnpj };
  return { kind: "socio", value: hashSocio(i.socio.cnpj.slice(0, 8), i.socio.nome) };
}

/** Grava na lista. Pedido repetido não duplica (fica a data do primeiro). */
export async function suprimir(itens: Item[], motivo: Motivo, prova: Record<string, unknown>) {
  const chaves = itens
    .filter((i) => ("email" in i ? !!i.email.trim() : "cnpj" in i ? CNPJ.test(i.cnpj) : CNPJ.test(i.socio.cnpj) && !!i.socio.nome.trim()))
    .map(chave);
  await gravar(chaves, motivo, prova);
}

/** Grava chaves já calculadas (ex.: as de um pedido público confirmado). */
export async function gravar(chaves: { kind: Tipo; value: string }[], motivo: Motivo, prova: Record<string, unknown>) {
  const linhas = chaves.map((c) => ({ ...c, reason: motivo, evidence: prova }));
  if (!linhas.length) return;
  const { error } = await createAdminClient().from("suppressions").upsert(linhas, { onConflict: "kind,value", ignoreDuplicates: true });
  if (error) throw new Error("Não foi possível gravar o pedido de remoção");
}
