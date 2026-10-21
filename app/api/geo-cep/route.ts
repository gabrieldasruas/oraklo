import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { coordenadasDosCeps } from "@/lib/geo/cep";

const MAX_CEPS = 60;

// POST /api/geo-cep  { ceps: string[] }  →  { coords: { [cep]: { lat, lng } } }
export async function POST(request: NextRequest) {
  if (!(await getUser())) return Response.json({ error: "Não autenticado" }, { status: 401 });
  let body: { ceps?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo inválido" }, { status: 400 });
  }
  const ceps = Array.isArray(body.ceps) ? body.ceps.map(String).slice(0, MAX_CEPS) : [];
  if (!ceps.length) return Response.json({ coords: {} });
  const coords = await coordenadasDosCeps(ceps);
  return Response.json({ coords });
}
