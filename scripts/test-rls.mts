// Teste de isolamento entre workspaces (aceite da fase 2).
// Cria dois usuários temporários, A cria lead e lista, B tenta ler/alterar/exportar os dados de A.
// No fim, apaga os usuários e workspaces de teste.
//
// Uso: npm run test:rls

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

let failures = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "OK  " : "FALHA"} ${msg}`);
  if (!ok) failures++;
};

const stamp = Date.now();
const password = `Teste-${stamp}-rls`;
const created: { id: string; workspace?: string }[] = [];

async function newUser(tag: string): Promise<{ client: SupabaseClient; id: string; workspace: string }> {
  const email = `rls-${tag}-${stamp}@prospecta.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: `Teste ${tag}`, company: `Workspace ${tag}` },
  });
  if (error) throw error;
  const entry: { id: string; workspace?: string } = { id: data.user.id };
  created.push(entry);
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { error: e } = await client.auth.signInWithPassword({ email, password });
  if (e) throw e;
  const { data: ws } = await client.rpc("current_workspace");
  entry.workspace = ws as string;
  return { client, id: data.user.id, workspace: ws as string };
}

try {
  const a = await newUser("a");
  const b = await newUser("b");
  check(Boolean(a.workspace && b.workspace && a.workspace !== b.workspace), "cada cadastro ganhou seu próprio workspace");

  // A cria um lead e uma lista pequena
  const { data: lead, error: le } = await a.client
    .from("leads")
    .insert({ workspace_id: a.workspace, name: "Lead de A", company: "Empresa A" })
    .select("id")
    .single();
  check(!le && Boolean(lead), "A cria lead no próprio workspace");
  const { data: listId, error: lse } = await a.client.rpc("create_list_from_filter", {
    p_name: "Lista de A",
    p_filter: { cnaes: ["4930202"], ufs: ["SC"], min_share_capital: 50000000 },
  });
  check(!lse && Boolean(listId), "A cria lista a partir de filtro");
  const { count: items } = await a.client.from("list_items").select("*", { count: "exact", head: true }).eq("list_id", listId);
  check((items ?? 0) > 0, `A enxerga os itens da própria lista (${items})`);

  // B tenta acessar os dados de A
  const { data: bLeads } = await b.client.from("leads").select("id");
  check((bLeads ?? []).every((l) => l.id !== lead?.id), "B não lê os leads de A");
  const { data: bLists } = await b.client.from("lists").select("id");
  check((bLists ?? []).every((l) => l.id !== listId), "B não lê as listas de A");
  const { count: bItems } = await b.client.from("list_items").select("*", { count: "exact", head: true }).eq("list_id", listId);
  check((bItems ?? 0) === 0, "B não lê os itens da lista de A");

  const { data: upd } = await b.client.from("leads").update({ status: "Sem interesse" }).eq("id", lead!.id).select("id");
  check((upd ?? []).length === 0, "B não altera lead de A");
  const { data: del } = await b.client.from("lists").delete().eq("id", listId).select("id");
  check((del ?? []).length === 0, "B não apaga lista de A");
  const { error: insLead } = await b.client.from("leads").insert({ workspace_id: a.workspace, name: "Intruso", company: "X" });
  check(Boolean(insLead), "B não cria lead no workspace de A");
  const { error: insItem } = await b.client.from("list_items").insert({ list_id: listId, cnpj: "83084301000178" });
  check(Boolean(insItem), "B não adiciona empresa à lista de A");
  const { error: exp } = await b.client.rpc("register_export", { p_list: listId });
  check(Boolean(exp), "B não exporta lista de A");
  const { data: bWs } = await b.client.from("workspaces").select("id");
  check((bWs ?? []).length === 1 && bWs![0].id === b.workspace, "B só enxerga o próprio workspace");

  // A base de empresas não é exposta direto pela API (só pelo servidor do app)
  const { data: comp } = await b.client.from("companies").select("cnpj").limit(1);
  check((comp ?? []).length === 0, "usuário logado não lê companies direto pela API");
  const { error: rpcErr } = await b.client.rpc("search_companies", { f: {} });
  check(Boolean(rpcErr), "usuário logado não chama search_companies direto");

  // A continua com tudo intacto
  const { data: aLead } = await a.client.from("leads").select("status").eq("id", lead!.id).single();
  check(aLead?.status === "Novo", "lead de A continua intacto");
  const { error: aExp } = await a.client.rpc("register_export", { p_list: listId });
  check(!aExp, "A exporta a própria lista (cota descontada)");
} catch (err) {
  console.error(err);
  failures++;
} finally {
  for (const u of created) {
    if (u.workspace) await admin.from("workspaces").delete().eq("id", u.workspace);
    await admin.auth.admin.deleteUser(u.id);
  }
  console.log(`\n${failures ? `${failures} falha(s)` : "Isolamento OK"} · ${created.length} usuários de teste removidos`);
  process.exitCode = failures ? 1 : 0;
}
