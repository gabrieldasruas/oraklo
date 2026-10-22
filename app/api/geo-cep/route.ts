import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { localizarVarios, type ItemGeo } from "@/lib/geo/cep";

const MAX_ITENS = 60;

// POST /api/geo-cep
// { itens: [{ id, cep?, endereco?, cidade?, uf? }] }  →  { coords: { [id]: { lat, lng, fonte } } }
// Primeiro tenta o CEP; se não achar, o endereço (rua + número + cidade).
export async function POST(request: NextRequest) {
  if (!(await getUser())) return Response.json({ error: "Não autenticado" }, { status: 401 });
  let body: { itens?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo inválido" }, { status: 400 });
  }
  const txt = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : null);
  const itens: ItemGeo[] = (Array.isArray(body.itens) ? body.itens : [])
    .slice(0, MAX_ITENS)
    .map((x) => x as Record<string, unknown>)
    .filter((x) => typeof x.id === "string")
    .map((x) => ({ id: String(x.id), cep: txt(x.cep), endereco: txt(x.endereco), cidade: txt(x.cidade), uf: txt(x.uf) }));
  if (!itens.length) return Response.json({ coords: {} });
  return Response.json({ coords: await localizarVarios(itens) });
}
