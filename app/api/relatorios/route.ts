import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { lerPeriodo, montarRelatorio, relatorioCsv } from "@/lib/relatorios";
import { LIMITES, planoDoWorkspace } from "@/lib/planos";

// CSV do relatório (mesmo período da tela). O RLS limita aos dados do workspace.
export async function GET(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: "Não autenticado" }, { status: 401 });
  if (!LIMITES[await planoDoWorkspace(await createClient(), user.workspaceId)].relatoriosCompletos) return Response.json({ error: "Exportação faz parte do Premium" }, { status: 402 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const periodo = lerPeriodo(sp);
  const r = await montarRelatorio(await createClient(), periodo);
  const nome = `relatorio-oraklo-${periodo.de}-a-${periodo.ate}.csv`;
  return new Response(relatorioCsv(r), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nome}"` },
  });
}
