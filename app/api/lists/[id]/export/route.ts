import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { buildListCsv, getList, getListCnpjs } from "@/lib/lists";

// POST /api/lists/:id/export → CSV. Desconta da cota mensal do workspace (register_export).
export async function POST(_: Request, ctx: RouteContext<"/api/lists/[id]/export">) {
  if (!(await getUser())) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { id } = await ctx.params;
  const list = await getList(id); // RLS: só listas do workspace do usuário
  if (!list) return Response.json({ error: "Lista não encontrada" }, { status: 404 });
  if (list.count === 0) return Response.json({ error: "A lista está vazia" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.rpc("register_export", { p_list: id });
  if (error) {
    const quota = error.hint === "quota_exceeded";
    return Response.json(
      { error: quota ? error.message : "Não foi possível registrar a exportação" },
      { status: quota ? 403 : 500 },
    );
  }

  try {
    const csv = await buildListCsv(await getListCnpjs(id));
    const file = `${list.name.normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "lista"}.csv`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Não foi possível gerar o arquivo" }, { status: 500 });
  }
}
