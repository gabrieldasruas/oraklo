import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";

// POST /api/lists/:id/items { cnpjs: string[] } → adiciona empresas à lista (ignora repetidas).
export async function POST(request: Request, ctx: RouteContext<"/api/lists/[id]/items">) {
  if (!(await getUser())) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { cnpjs?: unknown } | null;
  const cnpjs = Array.isArray(body?.cnpjs)
    ? [...new Set(body.cnpjs.map((c) => String(c).replace(/\D/g, "")).filter((c) => c.length === 14))].slice(0, 500)
    : [];
  if (!cnpjs.length) return Response.json({ error: "Informe CNPJs válidos" }, { status: 400 });

  const supabase = await createClient();
  // RLS de list_items só permite inserir em listas do workspace do usuário.
  const { error, count } = await supabase
    .from("list_items")
    .upsert(cnpjs.map((cnpj) => ({ list_id: id, cnpj })), { onConflict: "list_id,cnpj", ignoreDuplicates: true, count: "exact" });
  if (error) {
    const status = error.code === "42501" ? 404 : error.code === "23503" ? 400 : 500;
    return Response.json({ error: status === 400 ? "CNPJ fora da base" : "Lista não encontrada" }, { status });
  }
  return Response.json({ added: count ?? 0 });
}
