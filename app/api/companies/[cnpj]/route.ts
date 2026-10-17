import { getUser } from "@/lib/auth";
import { getCompany } from "@/lib/companies";

export async function GET(_: Request, ctx: RouteContext<"/api/companies/[cnpj]">) {
  if (!(await getUser())) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const { cnpj } = await ctx.params;
  try {
    const company = await getCompany(cnpj.replace(/\D/g, ""));
    return company ? Response.json(company) : Response.json({ error: "Empresa não encontrada" }, { status: 404 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Não foi possível carregar a empresa" }, { status: 500 });
  }
}
