import "server-only";

// Cliente da API v1 do RD Station CRM (https://developers.rdstation.com/reference/crm-v1-introducao-e-requisitos).
// Autenticação: token do usuário no parâmetro `token`. Limite: 120 requisições por minuto.

const BASE = "https://crm.rdstation.com/api/v1";

export class ErroRd extends Error {
  constructor(
    msg: string,
    public status: number | null,
  ) {
    super(msg);
  }
}

async function api<T>(token: string, caminho: string, init: { method?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<T> {
  const url = new URL(`${BASE}${caminho}`);
  url.searchParams.set("token", token);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: init.body ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    });
  } catch {
    throw new ErroRd("Não foi possível falar com o RD Station CRM.", null);
  }
  if (res.status === 401 || res.status === 403) throw new ErroRd("Token do RD Station inválido ou sem permissão.", res.status);
  if (res.status === 429) throw new ErroRd("Limite de requisições do RD Station atingido (120 por minuto). Tente em instantes.", 429);
  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new ErroRd(`O RD Station recusou o pedido (HTTP ${res.status})${corpo ? `: ${corpo.slice(0, 160)}` : ""}`, res.status);
  }
  return (await res.json()) as T;
}

export type ContaRd = { nome: string; email: string; organizacao: string };
export type EtapaRd = { id: string; nome: string; ordem: number };
export type FunilRd = { id: string; nome: string; etapas: EtapaRd[] };

export async function verificarToken(token: string): Promise<ContaRd> {
  const r = await api<{ name?: string; email?: string; organization?: string }>(token, "/token/check");
  return { nome: r.name ?? "", email: r.email ?? "", organizacao: r.organization ?? "" };
}

export async function listarFunis(token: string): Promise<FunilRd[]> {
  const r = await api<{ id?: string; _id?: string; name: string; deal_stages?: { _id?: string; id?: string; name: string; order?: number }[] }[]>(token, "/deal_pipelines", { query: { limit: "200" } });
  return r.map((f) => ({
    id: String(f.id ?? f._id ?? ""),
    nome: f.name,
    etapas: (f.deal_stages ?? []).map((e) => ({ id: String(e._id ?? e.id ?? ""), nome: e.name, ordem: e.order ?? 0 })).sort((a, b) => a.ordem - b.ordem),
  }));
}

export async function criarEmpresa(token: string, o: { nome: string; resumo?: string; site?: string }): Promise<string> {
  const r = await api<{ _id?: string; id?: string }>(token, "/organizations", {
    method: "POST",
    body: { organization: { name: o.nome.slice(0, 120), ...(o.resumo ? { resume: o.resumo.slice(0, 500) } : {}), ...(o.site ? { url: o.site } : {}) } },
  });
  return String(r._id ?? r.id ?? "");
}

export type ContatoRd = { nome: string; cargo?: string; email?: string; telefone?: string };

export async function criarNegociacao(token: string, o: { nome: string; etapaId?: string; empresaId?: string; contato: ContatoRd }): Promise<string> {
  const contato = {
    name: o.contato.nome.slice(0, 120),
    ...(o.contato.cargo ? { title: o.contato.cargo.slice(0, 120) } : {}),
    ...(o.contato.email ? { emails: [{ email: o.contato.email }] } : {}),
    ...(o.contato.telefone ? { phones: [{ phone: o.contato.telefone, type: "work" }] } : {}),
  };
  const r = await api<{ _id?: string; id?: string }>(token, "/deals", {
    method: "POST",
    body: {
      deal: { name: o.nome.slice(0, 120), ...(o.etapaId ? { deal_stage_id: o.etapaId } : {}) },
      contacts: [contato],
      ...(o.empresaId ? { organization: { _id: o.empresaId } } : {}),
    },
  });
  return String(r._id ?? r.id ?? "");
}

export async function moverNegociacao(token: string, dealId: string, etapaId: string): Promise<void> {
  await api(token, `/deals/${encodeURIComponent(dealId)}`, { method: "PUT", body: { deal_stage_id: etapaId } });
}

export async function anotar(token: string, dealId: string, texto: string): Promise<void> {
  await api(token, "/activities", { method: "POST", body: { activity: { deal_id: dealId, text: texto.slice(0, 2000) } } });
}
