import "server-only";

// CEP → coordenada (latitude/longitude), para pôr as empresas no mapa.
// Fonte principal: AwesomeAPI (cep.awesomeapi.com.br); reserva: BrasilAPI v2.
// No Brasil o CEP costuma identificar a rua, então a posição fica no nível do logradouro.
// As respostas ficam em cache (memória da instância + cache de dados do Next por 30 dias).

export type Coord = { lat: number; lng: number };

const memoria = new Map<string, Coord | null>();
const CACHE_30_DIAS = 60 * 60 * 24 * 30;
const TIMEOUT_MS = 4000;

const dentroDoBrasil = (c: Coord) => c.lat < 6 && c.lat > -34.5 && c.lng < -28 && c.lng > -75;

async function getJson(url: string) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { signal: ctrl.signal, next: { revalidate: CACHE_30_DIAS } });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function awesome(cep: string): Promise<Coord | null> {
  const j = await getJson(`https://cep.awesomeapi.com.br/json/${cep}`);
  const c = j && { lat: Number(j.lat), lng: Number(j.lng) };
  return c && Number.isFinite(c.lat) && Number.isFinite(c.lng) && dentroDoBrasil(c) ? c : null;
}

async function brasilApi(cep: string): Promise<Coord | null> {
  const j = await getJson(`https://brasilapi.com.br/api/cep/v2/${cep}`);
  const k = j?.location?.coordinates;
  const c = k && { lat: Number(k.latitude), lng: Number(k.longitude) };
  return c && Number.isFinite(c.lat) && Number.isFinite(c.lng) && dentroDoBrasil(c) ? c : null;
}

export async function coordenadaDoCep(cepBruto: string): Promise<Coord | null> {
  const cep = cepBruto.replace(/\D/g, "");
  if (cep.length !== 8) return null;
  if (memoria.has(cep)) return memoria.get(cep)!;
  const c = (await awesome(cep)) ?? (await brasilApi(cep));
  memoria.set(cep, c);
  return c;
}

/** Vários CEPs em paralelo, poucos de cada vez para não sobrecarregar os serviços gratuitos. */
export async function coordenadasDosCeps(ceps: string[], paralelo = 6) {
  const unicos = [...new Set(ceps.map((c) => c.replace(/\D/g, "")).filter((c) => c.length === 8))];
  const out: Record<string, Coord> = {};
  let i = 0;
  async function trabalhador() {
    while (i < unicos.length) {
      const cep = unicos[i++];
      const c = await coordenadaDoCep(cep);
      if (c) out[cep] = c;
    }
  }
  await Promise.all(Array.from({ length: Math.min(paralelo, unicos.length) }, trabalhador));
  return out;
}
