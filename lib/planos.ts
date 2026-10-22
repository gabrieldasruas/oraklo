import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

// Planos e limites mensais. O plano fica em `workspaces.plan`, que o usuário não consegue alterar
// (só a equipe Oraklo, pelo Supabase ou, no futuro, pelo pagamento). O uso é contado nos eventos
// do mês (`lead_events` só aceita inserir, então não dá para "zerar" apagando).

export type Plano = "gratis" | "pro";
export type Limites = { pipelineMes: number | null; emailsMes: number | null; iaMes: number | null; radarItens: number | null };

export const LIMITES: Record<Plano, Limites> = {
  gratis: { pipelineMes: 50, emailsMes: 20, iaMes: 10, radarItens: 5 },
  pro: { pipelineMes: null, emailsMes: null, iaMes: null, radarItens: null },
};
export const NOME_PLANO: Record<Plano, string> = { gratis: "Grátis", pro: "Profissional" };

export const planoDe = (valor: string | null | undefined): Plano => (["pro", "profissional", "equipe", "empresarial"].includes(String(valor ?? "").toLowerCase()) ? "pro" : "gratis");

export async function planoDoWorkspace(db: SupabaseClient, workspaceId: string): Promise<Plano> {
  const { data } = await db.from("workspaces").select("plan").eq("id", workspaceId).maybeSingle();
  return planoDe(data?.plan as string | undefined);
}

const inicioDoMes = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
};

export type Uso = { pipeline: number; emails: number; ia: number };

export async function usoDoMes(db: SupabaseClient): Promise<Uso> {
  const desde = inicioDoMes();
  const base = (tipo: string) => db.from("lead_events").select("id", { count: "exact", head: true }).eq("type", tipo).gte("created_at", desde);
  const [p, e, ia] = await Promise.all([base("created"), base("email_sent").eq("payload->>step", "1"), base("ai_generated")]);
  return { pipeline: p.count ?? 0, emails: e.count ?? 0, ia: ia.count ?? 0 };
}

/** Quanto ainda cabe no mês (null = ilimitado). */
export function restante(limite: number | null, usado: number) {
  return limite === null ? null : Math.max(0, limite - usado);
}

export class LimiteAtingido extends Error {
  constructor(o_que: string, limite: number) {
    super(`Você chegou ao limite do plano Grátis (${limite} ${o_que} por mês). Fale com a gente para liberar o Profissional.`);
  }
}
