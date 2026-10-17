import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { countCompanies, filterFromParams, searchCompanies } from "@/lib/companies";

// GET /api/companies?cnae=&uf=&municipio=&porte=&capital_min=&tem_email=&matriz=&q=&cursor=
export async function GET(request: NextRequest) {
  if (!(await getUser())) return Response.json({ error: "Não autenticado" }, { status: 401 });
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const filter = filterFromParams(params);
  try {
    const [page, total] = await Promise.all([searchCompanies(filter, params.cursor), countCompanies(filter)]);
    return Response.json({ ...page, total, filter });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Não foi possível buscar empresas" }, { status: 500 });
  }
}
