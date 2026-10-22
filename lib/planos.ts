import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LIMITES, NOME_PLANO, type Limites, type Plano } from "./pacotes";

// Planos e limites mensais (definidos em lib/pacotes.ts). O plano fica em `workspaces.plan`, que o
// usuário não consegue alterar (só a equipe Oraklo pelo Supabase ou, no futuro, o pagamento).
// O uso é contado nos eventos do mês (`lead_events` só aceita inserir) e, para buscas, numa linha de uso.

export { LIMITES, NOME_PLANO };
export type { Limites, Plano };

export const planoDe = (valor: string | null | undefined): Plano => {
  const v = String(valor ?? "").toLowerCase();
  if (["ultra", "equipe", "empresarial"].includes(v)) return "ultra";
  if (["premium", "pro", "profissional", "premium3"].includes(v)) return "premium";
  return "gratis";
};

export async function planoDoWorkspace(db: SupabaseClient, workspaceId: string): Promise<Plano> {
  const { data } = await db.from("workspaces").select("plan").eq("id", workspaceId).maybeSingle();
  return planoDe(data?.plan as string | undefined);
}

const inicioDoMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};
const mesAtual = () => new Date().toISOString().slice(0, 7);

export type Uso = { pipeline: number; emails: number; ia: number; buscas: number };

export const USO_TAG = "__uso__";

export async function usoDoMes(db: SupabaseClient): Promise<Uso> {
  const desde = inicioDoMes();
  const base = (tipo: string) => db.from("lead_events").select("id", { count: "exact", head: true }).eq("type", tipo).gte("created_at", desde);
  const [p, e, ia, uso] = await Promise.all([
    base("created"),
    base("email_sent").eq("payload->>step", "1"),
    base("ai_generated"),
    db.from("lists").select("filter").eq("tag", USO_TAG).limit(1).maybeSingle(),
  ]);
  const f = (uso.data?.filter ?? {}) as { mes?: string; buscas?: number };
  return { pipeline: p.count ?? 0, emails: e.count ?? 0, ia: ia.count ?? 0, buscas: f.mes === mesAtual() ? (f.buscas ?? 0) : 0 };
}

/**
 * Conta uma busca na Busca avançada. Devolve false se o plano não permite mais buscas no mês.
 * O contador reinicia sozinho na virada do mês.
 */
export async function consumirBusca(db: SupabaseClient, workspaceId: string): Promise<{ ok: boolean; limite: number | null; usadas: number }> {
  const limite = LIMITES[await planoDoWorkspace(db, workspaceId)].buscasMes;
  const { data } = await db.from("lists").select("id, filter").eq("tag", USO_TAG).limit(1).maybeSingle();
  const f = (data?.filter ?? {}) as { mes?: string; buscas?: number };
  const usadas = f.mes === mesAtual() ? (f.buscas ?? 0) : 0;
  if (limite !== null && usadas >= limite) return { ok: false, limite, usadas };
  const novo = { mes: mesAtual(), buscas: usadas + 1 };
  if (data) await db.from("lists").update({ filter: novo }).eq("id", data.id);
  else await db.from("lists").insert({ workspace_id: workspaceId, tag: USO_TAG, name: "Uso do mês", filter: novo });
  return { ok: true, limite, usadas: usadas + 1 };
}

/** Quanto ainda cabe no mês (null = ilimitado). */
export function restante(limite: number | null, usado: number) {
  return limite === null ? null : Math.max(0, limite - usado);
}

export class LimiteAtingido extends Error {
  constructor(o_que: string, limite: number) {
    super(`Você chegou ao limite do seu pacote (${limite} ${o_que} por mês). Veja os pacotes para liberar mais.`);
  }
}
