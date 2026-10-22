"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { getCompany } from "@/lib/companies";
import { ehDecisor, rotuloCargo } from "@/lib/crm";
import { calcularScore } from "@/lib/score";
import { avisarCrm } from "@/lib/crm-webhook";
import { LIMITES, planoDoWorkspace, restante, usoDoMes } from "@/lib/planos";

// Empresas da base → leads do workspace (um por empresa), com o decisor do QSA como contato
// e o score calculado. Empresas que já estão no pipeline não são duplicadas.

const MAX_POR_VEZ = 100;

export async function adicionarEmpresasAoPipeline(cnpjs: string[]): Promise<{ criados: number; jaExistiam: number; falharam: number; limitados: number }> {
  const user = await requireUser();
  const lista = [...new Set(cnpjs.map((c) => c.replace(/\D/g, "")).filter((c) => c.length === 14))].slice(0, MAX_POR_VEZ);
  if (!lista.length) return { criados: 0, jaExistiam: 0, falharam: 0, limitados: 0 };

  const supabase = await createClient();
  const { data: existentes } = await supabase.from("leads").select("cnpj").in("cnpj", lista);
  const ja = new Set((existentes ?? []).map((l) => (l.cnpj as string)?.trim()));
  const todosNovos = lista.filter((c) => !ja.has(c));
  // limite do plano Grátis (empresas por mês no pipeline)
  const plano = await planoDoWorkspace(supabase, user.workspaceId);
  const cabe = restante(LIMITES[plano].pipelineMes, (await usoDoMes(supabase)).pipeline);
  const novos = cabe === null ? todosNovos : todosNovos.slice(0, cabe);
  const limitados = todosNovos.length - novos.length;

  let criados = 0;
  let falharam = 0;
  // poucos de cada vez: cada empresa busca sócios e cargos
  for (let i = 0; i < novos.length; i += 8) {
    const lote = await Promise.all(novos.slice(i, i + 8).map((c) => getCompany(c).catch(() => null)));
    const linhas = lote.flatMap((c) => {
      if (!c) {
        falharam++;
        return [];
      }
      const pessoas = c.partners.filter((p) => p.kind !== "PJ");
      const decisor = pessoas.find((p) => ehDecisor(p.role)) ?? pessoas[0] ?? c.partners[0];
      const { score } = calcularScore(c);
      return [
        {
          workspace_id: user.workspaceId,
          cnpj: c.cnpj,
          name: (decisor?.name ?? "Contato principal").slice(0, 80),
          role: decisor ? rotuloCargo(decisor.role).slice(0, 80) : "",
          company: c.name.slice(0, 80),
          email: (c.email ?? "").slice(0, 120),
          phone: (c.phones[0] ?? "").slice(0, 30),
          place: [c.city, c.uf].filter(Boolean).join(", ").slice(0, 80),
          score,
        },
      ];
    });
    if (!linhas.length) continue;
    const { data, error } = await supabase.from("leads").insert(linhas).select("id");
    if (error) {
      falharam += linhas.length;
      continue;
    }
    criados += data.length;
    await avisarCrm(supabase, user.workspaceName, "lead.criado", data.map((l) => l.id));
    await supabase
      .from("lead_events")
      .insert(data.map((l) => ({ lead_id: l.id, workspace_id: user.workspaceId, type: "created", payload: { from: "busca" } })));
  }
  return { criados, jaExistiam: ja.size, falharam, limitados };
}

/** Salva empresas escolhidas como uma lista do workspace (para exportar depois). */
export async function salvarEmpresasComoLista(nome: string, cnpjs: string[]): Promise<{ id: string; total: number }> {
  const user = await requireUser();
  const lista = [...new Set(cnpjs.map((c) => c.replace(/\D/g, "")).filter((c) => c.length === 14))].slice(0, 1000);
  const titulo = nome.trim().slice(0, 120) || `Busca avançada · ${new Date().toLocaleDateString("pt-BR")}`;
  if (!lista.length) throw new Error("Nenhuma empresa selecionada");
  const supabase = await createClient();
  const { data, error } = await supabase.from("lists").insert({ workspace_id: user.workspaceId, name: titulo, tag: "busca avançada" }).select("id").single();
  if (error) throw new Error("Não foi possível criar a lista");
  const { error: e2 } = await supabase.from("list_items").insert(lista.map((cnpj) => ({ list_id: data.id, cnpj })));
  if (e2) throw new Error("A lista foi criada, mas não deu para adicionar as empresas");
  return { id: data.id, total: lista.length };
}
