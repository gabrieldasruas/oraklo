import "server-only";

// Localiza empresas no mapa (latitude/longitude) a partir dos dados da Receita.
// 1º CEP → AwesomeAPI (cep.awesomeapi.com.br), que costuma devolver o ponto da rua.
// 2º Endereço (rua + número + cidade/UF) → Photon (photon.komoot.io, base do OpenStreetMap).
// Não usamos a BrasilAPI: para muitos CEPs ela devolve o centro da cidade, o que empilhava
// todas as empresas num ponto só.
// As respostas ficam em cache (memória da instância + cache de dados do Next por 30 dias).

export type Coord = { lat: number; lng: number; fonte: "cep" | "endereco" };
export type ItemGeo = { id: string; cep?: string | null; endereco?: string | null; cidade?: string | null; uf?: string | null };

const memoria = new Map<string, Coord | null>();
const CACHE_30_DIAS = 60 * 60 * 24 * 30;
const TIMEOUT_MS = 5000;

const dentroDoBrasil = (c: { lat: number; lng: number }) => c.lat < 6 && c.lat > -34.5 && c.lng < -28 && c.lng > -75;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string, tentativas = 2): Promise<unknown> {
  for (let t = 0; t < tentativas; t++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const r = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "Oraklo/1.0 (prospeccao B2B)" },
        next: { revalidate: CACHE_30_DIAS },
      });
      if (r.status === 429 || r.status >= 500) {
        await espera(600 * (t + 1)); // limite do serviço gratuito: espera e tenta de novo
        continue;
      }
      return r.ok ? await r.json() : null;
    } catch {
      await espera(300);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

async function porCep(cepBruto: string): Promise<Coord | null> {
  const cep = cepBruto.replace(/\D/g, "");
  if (cep.length !== 8) return null;
  const chave = `cep:${cep}`;
  if (memoria.has(chave)) return memoria.get(chave)!;
  const j = (await getJson(`https://cep.awesomeapi.com.br/json/${cep}`)) as { lat?: string; lng?: string } | null;
  const c = j && { lat: Number(j.lat), lng: Number(j.lng), fonte: "cep" as const };
  const ok = c && Number.isFinite(c.lat) && Number.isFinite(c.lng) && dentroDoBrasil(c) ? c : null;
  memoria.set(chave, ok);
  return ok;
}

type PhotonFeature = { geometry?: { coordinates?: [number, number] }; properties?: { type?: string; city?: string; state?: string } };

async function porEndereco(endereco: string, cidade: string, uf: string): Promise<Coord | null> {
  const q = `${endereco}, ${cidade}, ${uf}, Brasil`;
  const chave = `end:${q.toLowerCase()}`;
  if (memoria.has(chave)) return memoria.get(chave)!;
  const url = `https://photon.komoot.io/api/?limit=1&lang=default&q=${encodeURIComponent(q)}`;
  const j = (await getJson(url)) as { features?: PhotonFeature[] } | null;
  const f = j?.features?.[0];
  const [lng, lat] = f?.geometry?.coordinates ?? [];
  // só aceita resultados no nível de rua/endereço (cidade inteira não ajuda)
  const tipoOk = ["street", "house", "locality", "district"].includes(f?.properties?.type ?? "");
  const c = { lat: Number(lat), lng: Number(lng), fonte: "endereco" as const };
  const ok = tipoOk && Number.isFinite(c.lat) && Number.isFinite(c.lng) && dentroDoBrasil(c) ? c : null;
  memoria.set(chave, ok);
  return ok;
}

export async function localizar(item: ItemGeo): Promise<Coord | null> {
  if (item.cep) {
    const c = await porCep(item.cep);
    if (c) return c;
  }
  if (item.endereco && item.cidade && item.uf) return porEndereco(item.endereco, item.cidade, item.uf);
  return null;
}

/** Vários itens em paralelo, poucos de cada vez para respeitar os serviços gratuitos. */
export async function localizarVarios(itens: ItemGeo[], paralelo = 4) {
  const out: Record<string, Coord> = {};
  let i = 0;
  async function trabalhador() {
    while (i < itens.length) {
      const item = itens[i++];
      const c = await localizar(item);
      if (c) out[item.id] = c;
    }
  }
  await Promise.all(Array.from({ length: Math.min(paralelo, itens.length) }, trabalhador));
  return out;
}
