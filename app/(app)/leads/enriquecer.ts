"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { ehDecisor, rotuloCargo, sitePeloEmail } from "@/lib/crm";
import { HUNTER_KEY_TAG } from "@/lib/config-workspace";
import { titleCase } from "@/lib/format";
import { cifrar, decifrar } from "@/lib/segredo";
import { LIMITES, planoDoWorkspace } from "@/lib/planos";

// Decisores do lead:
// 1. Sócios da Receita (QSA): de graça, em todos os pacotes. Em PME o sócio costuma ser quem decide.
// 2. E-mail pelo Hunter (https://hunter.io) com a chave do PRÓPRIO cliente: os créditos (em dólar) saem
//    da conta dele, nunca da Oraklo. A chave é validada, cifrada e nunca volta para o navegador.
// Erros voltam como { ok: false, erro } (o Next esconde exceções em produção).

export type Pessoa = { nome: string; cargo: string; email: string; confianca: number; linkedin: string | null; senioridade: string | null };
export type Socio = { nome: string; cargo: string; decisor: boolean; pessoaFisica: boolean };
type Res<T> = ({ ok: true } & T) | { ok: false; erro: string };

const SO_PREMIUM = "Buscar e-mails de decisores faz parte do pacote Premium.";
const liberado = async (workspaceId: string) => LIMITES[await planoDoWorkspace(await createClient(), workspaceId)].decisores;

async function chaveSalva() {
  const db = await createClient();
  const { data } = await db.from("lists").select("id, filter").eq("tag", HUNTER_KEY_TAG).limit(1).maybeSingle();
  const f = data?.filter as { cifrado?: string; final?: string } | null;
  return { db, id: (data?.id as string | undefined) ?? null, chave: f?.cifrado ? decifrar(f.cifrado) : null, final: f?.final ?? null };
}

async function hunter<T>(caminho: string, params: Record<string, string>, chave: string): Promise<T> {
  const qs = new URLSearchParams({ ...params, api_key: chave });
  const res = await fetch(`https://api.hunter.io/v2/${caminho}?${qs}`, { cache: "no-store" });
  if (res.status === 401) throw new Error("A chave do Hunter foi recusada. Confira em Integrar CRM.");
  if (res.status === 429 || res.status === 402) throw new Error("Os créditos da sua conta no Hunter acabaram este mês.");
  if (!res.ok) throw new Error("Não foi possível consultar o Hunter.");
  return ((await res.json()) as { data: T }).data;
}

const msg = (e: unknown) => (e instanceof Error ? e.message : "Não foi possível consultar o Hunter.");

// Conta do Hunter ----------------------------------------------------------------

export type ContaHunter = { conectado: boolean; final: string | null; creditos: { usados: number; total: number } | null; liberado: boolean };

async function creditos(chave: string) {
  const d = await hunter<{ requests?: { searches?: { used: number; available: number } } }>("account", {}, chave);
  const s = d.requests?.searches;
  return s ? { usados: s.used, total: s.available } : null;
}

export async function contaHunter(): Promise<ContaHunter> {
  const user = await requireUser();
  const [{ chave, final }, ok] = await Promise.all([chaveSalva(), liberado(user.workspaceId)]);
  if (!chave) return { conectado: false, final: null, creditos: null, liberado: ok };
  return { conectado: true, final, creditos: await creditos(chave).catch(() => null), liberado: ok };
}

export async function conectarHunter(chave: string): Promise<Res<{ conta: ContaHunter }>> {
  const user = await requireUser();
  if (!(await liberado(user.workspaceId))) return { ok: false, erro: SO_PREMIUM };
  const k = chave.trim();
  if (!/^[a-f0-9]{30,64}$/i.test(k)) return { ok: false, erro: "Essa chave não parece válida. Copie em hunter.io → API." };
  try {
    const cred = await creditos(k);
    const { db, id } = await chaveSalva();
    const linha = { filter: { cifrado: cifrar(k), final: k.slice(-4) } };
    const { error } = id
      ? await db.from("lists").update(linha).eq("id", id)
      : await db.from("lists").insert({ workspace_id: user.workspaceId, tag: HUNTER_KEY_TAG, name: "Integração Hunter", ...linha });
    if (error) return { ok: false, erro: "Não foi possível guardar a chave." };
    return { ok: true, conta: { conectado: true, final: k.slice(-4), creditos: cred, liberado: true } };
  } catch (e) {
    return { ok: false, erro: msg(e) };
  }
}

export async function desconectarHunter(): Promise<void> {
  await requireUser();
  const { db, id } = await chaveSalva();
  if (id) await db.from("lists").delete().eq("id", id);
}

// Decisores do lead --------------------------------------------------------------

/** Sócios da Receita (decisores primeiro) e o domínio provável da empresa. Não gasta nada. */
export async function decisoresDoLead(leadId: string): Promise<{ socios: Socio[]; dominio: string | null; hunter: boolean; liberado: boolean }> {
  const user = await requireUser();
  const db = await createClient();
  // a leitura pelo cliente do usuário garante que o lead é do workspace dele (RLS)
  const { data: lead } = await db.from("leads").select("email, cnpj").eq("id", leadId).maybeSingle();
  const [{ chave }, ok] = await Promise.all([chaveSalva(), liberado(user.workspaceId)]);
  let socios: Socio[] = [];
  let emailReceita: string | null = null;
  if (lead?.cnpj) {
    // companies e partners só são lidas pelo servidor (service role)
    const admin = createAdminClient();
    const { data: c } = await admin.from("companies").select("cnpj_root, receita_email").eq("cnpj", lead.cnpj).maybeSingle();
    emailReceita = (c?.receita_email as string | null) ?? null;
    if (c) {
      const { data: p } = await admin.from("partners").select("name, kind, role").eq("cnpj_root", c.cnpj_root).limit(30);
      socios = (p ?? [])
        .map((s) => ({ nome: titleCase(s.name as string), cargo: rotuloCargo(s.role as string | null), decisor: ehDecisor(s.role as string | null), pessoaFisica: s.kind === "PF" }))
        .sort((a, b) => Number(b.decisor) - Number(a.decisor) || a.nome.localeCompare(b.nome));
    }
  }
  return { socios, dominio: sitePeloEmail((lead?.email as string) || null) ?? sitePeloEmail(emailReceita), hunter: Boolean(chave), liberado: ok };
}

const limparDominio = (d: string) =>
  d
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#]/)[0];

function dominioValido(dominio: string): string {
  const d = limparDominio(dominio);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) throw new Error("Domínio inválido (ex.: empresa.com.br)");
  if (!sitePeloEmail(`x@${d}`)) throw new Error("Esse domínio é de e-mail gratuito ou de contador: a empresa não tem domínio próprio para buscar.");
  return d;
}

async function preparar(dominio: string) {
  const user = await requireUser();
  if (!(await liberado(user.workspaceId))) throw new Error(SO_PREMIUM);
  const { chave } = await chaveSalva();
  if (!chave) throw new Error("Conecte sua conta do Hunter em Integrar CRM para buscar e-mails.");
  return { chave, d: dominioValido(dominio) };
}

/** E-mail de um sócio pelo Email Finder (1 crédito da conta do cliente, só quando encontra). */
export async function emailDoSocio(dominio: string, nome: string): Promise<Res<{ pessoa: Pessoa | null }>> {
  try {
    const { chave, d } = await preparar(dominio);
    const partes = nome.trim().split(/\s+/);
    if (partes.length < 2) return { ok: false, erro: "Precisa de nome e sobrenome." };
    const r = await hunter<{ email: string | null; score: number | null; position: string | null; linkedin_url: string | null; seniority: string | null }>(
      "email-finder",
      { domain: d, first_name: partes[0], last_name: partes[partes.length - 1] },
      chave,
    );
    if (!r.email) return { ok: true, pessoa: null };
    return { ok: true, pessoa: { nome, cargo: r.position ?? "", email: r.email, confianca: r.score ?? 0, linkedin: r.linkedin_url, senioridade: r.seniority } };
  } catch (e) {
    return { ok: false, erro: msg(e) };
  }
}

/** Outras pessoas da empresa pelo domain-search (gasta mais créditos da conta do cliente). */
export async function outrasPessoas(dominio: string): Promise<Res<{ pessoas: Pessoa[] }>> {
  try {
    const { chave, d } = await preparar(dominio);
    const r = await hunter<{
      emails?: { value: string; first_name: string | null; last_name: string | null; position: string | null; confidence: number; linkedin: string | null; seniority: string | null }[];
    }>("domain-search", { domain: d, limit: "10" }, chave);
    const ordem: Record<string, number> = { executive: 0, senior: 1 };
    const pessoas = (r.emails ?? [])
      .map((e) => ({
        nome: [e.first_name, e.last_name].filter(Boolean).join(" ") || e.value.split("@")[0],
        cargo: e.position ?? "",
        email: e.value,
        confianca: e.confidence,
        linkedin: e.linkedin,
        senioridade: e.seniority,
      }))
      .sort((a, b) => (ordem[a.senioridade ?? ""] ?? 2) - (ordem[b.senioridade ?? ""] ?? 2) || b.confianca - a.confianca);
    return { ok: true, pessoas };
  } catch (e) {
    return { ok: false, erro: msg(e) };
  }
}

/** Usa a pessoa (sócio ou encontrada no Hunter) como contato principal do lead. */
export async function usarContato(leadId: string, p: { nome: string; cargo: string; email: string }): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ name: p.nome.slice(0, 80), role: p.cargo.slice(0, 80), ...(p.email ? { email: p.email.slice(0, 120) } : {}) })
    .eq("id", leadId);
  if (error) throw new Error("Não foi possível atualizar o lead");
  await supabase.from("lead_events").insert({ lead_id: leadId, workspace_id: user.workspaceId, type: "enriched", payload: { name: p.nome, email: p.email, source: p.email ? "hunter" : "receita" } });
}
