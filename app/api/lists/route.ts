import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { filterFromParams } from "@/lib/companies";
import { getLists } from "@/lib/lists";

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });
  return Response.json(await getLists(user.id));
}

// POST /api/lists { name, query?: "cnae=...&uf=SC", niche?: "transportadoras-sc" }
export async function POST(request: Request) {
  if (!(await getUser())) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { name?: string; query?: string; niche?: string } | null;
  const name = body?.name?.trim().slice(0, 120);
  if (!name) return Response.json({ error: "Informe o nome da lista" }, { status: 400 });

  const supabase = await createClient();
  let filter: unknown = null;
  if (body?.niche) {
    const { data } = await supabase.from("niches").select("filter").eq("id", body.niche).maybeSingle();
    if (!data) return Response.json({ error: "Nicho não encontrado" }, { status: 404 });
    filter = data.filter;
  } else {
    const q = new URLSearchParams(body?.query ?? "");
    const params: Record<string, string[]> = {};
    for (const key of new Set(q.keys())) params[key] = q.getAll(key);
    filter = filterFromParams(params);
  }
  const { data, error } = await supabase.rpc("create_list_from_filter", {
    p_name: name,
    p_filter: filter,
    p_niche: body?.niche ?? null,
    p_tag: body?.niche ? null : "Busca",
  });
  if (error) return Response.json({ error: "Não foi possível criar a lista" }, { status: 500 });
  return Response.json({ id: data }, { status: 201 });
}
