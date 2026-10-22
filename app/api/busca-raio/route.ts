import type { NextRequest } from "next/server";
import { getUser } from "@/lib/auth";
import { countCompanies, searchCompanies, type CompanyFilter } from "@/lib/companies";
import { centroNoBrasil, cidadeMaisProxima, MUNICIPIOS, municipiosNoRaio, RAIO_MAX_KM, RAIO_MIN_KM, UFS, type Escopo } from "@/lib/geo/radius";

const PORTES = ["ME", "EPP", "DEMAIS", "NAO_INFORMADO"];

// POST /api/busca-raio
// { lat, lng, raioKm, principal?: boolean (padrão true), escopo?: "raio" | "cidade" | "estado", ufs?: string[], cnaes?: string[], portes?: string[], temEmail?: boolean, matriz?: boolean, cursor?: string }
export async function POST(request: NextRequest) {
  if (!(await getUser())) return Response.json({ error: "Não autenticado" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const raioKm = Number(body.raioKm);
  if (![lat, lng, raioKm].every(Number.isFinite)) return Response.json({ error: "Centro ou raio inválido" }, { status: 400 });
  if (raioKm < RAIO_MIN_KM || raioKm > RAIO_MAX_KM)
    return Response.json({ error: `O raio deve ficar entre ${RAIO_MIN_KM} e ${RAIO_MAX_KM} km` }, { status: 400 });
  if (!centroNoBrasil(lat, lng)) return Response.json({ error: "O centro da busca precisa estar dentro do Brasil" }, { status: 400 });

  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  const ufs = arr(body.ufs).filter((u) => (UFS as readonly string[]).includes(u));
  const cnaes = arr(body.cnaes).map((c) => c.replace(/\D/g, "")).filter((c) => c.length === 7);
  const portes = arr(body.portes).filter((p) => PORTES.includes(p));
  const cursor = typeof body.cursor === "string" ? body.cursor : undefined;

  const escopo: Escopo = body.escopo === "cidade" || body.escopo === "estado" ? body.escopo : "raio";
  const centro = cidadeMaisProxima(lat, lng).municipio;

  // raio: cidades no círculo · cidade: só a do centro · estado: o(s) estado(s) inteiro(s)
  const ufsEstado = ufs.length ? ufs : [centro.uf];
  const municipios =
    escopo === "cidade"
      ? [centro]
      : escopo === "estado"
        ? MUNICIPIOS.filter((m) => ufsEstado.includes(m.uf))
        : municipiosNoRaio(lat, lng, raioKm, ufs);
  const resumo = {
    escopo,
    centro: { name: centro.name, uf: centro.uf },
    municipios: municipios.length,
    ufs: escopo === "estado" ? ufsEstado : [...new Set(municipios.map((m) => m.uf))],
    // os mais próximos, para mostrar no mapa/painel
    cidades: municipios.slice(0, 400).map((m) => ({ code: m.code, name: m.name, uf: m.uf, lat: m.lat, lng: m.lng })),
  };
  if (!municipios.length) return Response.json({ items: [], nextCursor: null, total: 0, ...resumo });

  // no estado inteiro, filtrar por UF é mais leve que mandar centenas de cidades
  const filter: CompanyFilter = escopo === "estado" ? { ufs: ufsEstado } : { municipalities: municipios.map((m) => m.code) };
  if (cnaes.length) {
    filter.cnaes = cnaes;
    // padrão: só a atividade principal (quem tem a atividade só como secundária fica de fora)
    if (body.principal !== false) filter.cnae_main_only = true;
  }
  if (portes.length) filter.sizes = portes;
  if (body.temEmail === true) filter.has_email = true;
  if (body.matriz === true) filter.headquarters_only = true;

  try {
    const [page, total] = await Promise.all([searchCompanies(filter, cursor), cursor ? Promise.resolve(null) : countCompanies(filter)]);
    return Response.json({ ...page, total, ...resumo });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Não foi possível buscar empresas" }, { status: 500 });
  }
}
