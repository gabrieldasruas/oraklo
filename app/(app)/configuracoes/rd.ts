"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { CONFIG_TAG, RD_TOKEN_TAG, completarConfig, type ConfigWorkspace } from "@/lib/config-workspace";
import { cifrar, decifrar } from "@/lib/segredo";
import { ErroRd, listarFunis, verificarToken, type FunilRd } from "@/lib/rdstation";
import { enviarAgora } from "@/lib/rd-sync";
import { LIMITES, planoDoWorkspace } from "@/lib/planos";

const liberado = async (workspaceId: string) => LIMITES[await planoDoWorkspace(await createClient(), workspaceId)].integracoes;
const SO_PREMIUM = "A integração com o RD Station faz parte do pacote Premium.";

// Integração direta com o RD Station CRM. O token é validado, cifrado e guardado numa linha própria;
// nunca volta para o navegador. Erros voltam como { ok: false, erro } (o Next esconde exceções em produção).

type Res<T> = ({ ok: true } & T) | { ok: false; erro: string };
const msg = (e: unknown) => (e instanceof ErroRd ? e.message : "Não foi possível falar com o RD Station CRM.");

async function lerConfig() {
  const db = await createClient();
  const { data } = await db.from("lists").select("id, filter").eq("tag", CONFIG_TAG).limit(1).maybeSingle();
  return { db, id: (data?.id as string | undefined) ?? null, cfg: completarConfig(data?.filter as Partial<ConfigWorkspace> | null) };
}

async function gravarConfig(workspaceId: string, mudar: (c: ConfigWorkspace) => ConfigWorkspace) {
  const { db, id, cfg } = await lerConfig();
  const novo = completarConfig(mudar(cfg));
  const { error } = id
    ? await db.from("lists").update({ filter: novo }).eq("id", id)
    : await db.from("lists").insert({ workspace_id: workspaceId, tag: CONFIG_TAG, name: "Configurações", filter: novo });
  if (error) throw new Error("Não foi possível salvar");
  return novo;
}

async function tokenSalvo() {
  const db = await createClient();
  const { data } = await db.from("lists").select("id, filter").eq("tag", RD_TOKEN_TAG).limit(1).maybeSingle();
  const cifrado = (data?.filter as { cifrado?: string } | null)?.cifrado;
  return { db, id: (data?.id as string | undefined) ?? null, token: cifrado ? decifrar(cifrado) : null };
}

/** Valida o token, guarda cifrado e devolve a conta e os funis. */
export async function conectarRd(token: string): Promise<Res<{ config: ConfigWorkspace; funis: FunilRd[] }>> {
  const user = await requireUser();
  if (!(await liberado(user.workspaceId))) return { ok: false, erro: SO_PREMIUM };
  const t = token.trim();
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(t)) return { ok: false, erro: "Esse token não parece válido. Copie de RD Station CRM → Perfil → Token da API." };
  try {
    const conta = await verificarToken(t);
    const funis = await listarFunis(t);
    const { db, id } = await tokenSalvo();
    const linha = { filter: { cifrado: cifrar(t), final: t.slice(-4) } };
    const { error } = id
      ? await db.from("lists").update(linha).eq("id", id)
      : await db.from("lists").insert({ workspace_id: user.workspaceId, tag: RD_TOKEN_TAG, name: "Integração RD Station", ...linha });
    if (error) return { ok: false, erro: "Não foi possível guardar o token." };
    const primeiro = funis[0];
    const config = await gravarConfig(user.workspaceId, (c) => ({
      ...c,
      rd: {
        ...c.rd,
        conectado: true,
        conta,
        // primeira conexão: sugere o 1º funil e um mapeamento pela ordem das etapas
        funilId: c.rd.funilId || primeiro?.id || "",
        etapas: Object.keys(c.rd.etapas).length || !primeiro ? c.rd.etapas : sugerirEtapas(primeiro),
      },
    }));
    return { ok: true, config, funis };
  } catch (e) {
    return { ok: false, erro: msg(e) };
  }
}

function sugerirEtapas(f: FunilRd): Record<string, string> {
  const e = f.etapas;
  if (!e.length) return {};
  const pega = (i: number) => e[Math.min(i, e.length - 1)].id;
  return { Novo: pega(0), "Em sequência": pega(1), Respondeu: pega(2), "Reunião marcada": pega(3) };
}

export async function funisRd(): Promise<Res<{ funis: FunilRd[] }>> {
  await requireUser();
  const { token } = await tokenSalvo();
  if (!token) return { ok: false, erro: "Conecte o RD Station primeiro." };
  try {
    return { ok: true, funis: await listarFunis(token) };
  } catch (e) {
    return { ok: false, erro: msg(e) };
  }
}

export async function desconectarRd(): Promise<ConfigWorkspace> {
  const user = await requireUser();
  const { db, id } = await tokenSalvo();
  if (id) await db.from("lists").delete().eq("id", id);
  return gravarConfig(user.workspaceId, (c) => ({ ...c, rd: { ...c.rd, conectado: false, conta: null } }));
}

/** Envia ao RD os leads que ainda não estão lá (até 50 por vez, por causa do limite da API). */
export async function enviarLeadsRd(leadIds?: string[]): Promise<Res<{ enviados: number; jaEstavam: number; falharam: number; restam: number; aviso: string | null }>> {
  const user = await requireUser();
  if (!(await liberado(user.workspaceId))) return { ok: false, erro: SO_PREMIUM };
  const db = await createClient();
  let ids = leadIds;
  let restam = 0;
  if (!ids) {
    const [{ data: todos }, { data: feitos }] = await Promise.all([
      db.from("leads").select("id").order("created_at", { ascending: false }).limit(2000),
      db.from("lead_events").select("lead_id").eq("type", "rd_synced").limit(10000),
    ]);
    const ja = new Set((feitos ?? []).map((e) => e.lead_id as string));
    const pendentes = (todos ?? []).map((l) => l.id as string).filter((i) => !ja.has(i));
    ids = pendentes.slice(0, 50);
    restam = Math.max(0, pendentes.length - ids.length);
  }
  if (!ids.length) return { ok: true, enviados: 0, jaEstavam: 0, falharam: 0, restam: 0, aviso: null };
  const r = await enviarAgora(db, ids);
  if (r.erro && !r.enviados && r.falharam === 0 && r.jaEstavam === 0) return { ok: false, erro: r.erro };
  return { ok: true, enviados: r.enviados, jaEstavam: r.jaEstavam, falharam: r.falharam, restam, aviso: r.erro };
}
