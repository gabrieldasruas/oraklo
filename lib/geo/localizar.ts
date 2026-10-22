// Localiza empresas no mapa direto do navegador de quem usa o Oraklo.
//
// Por que no navegador: os serviços gratuitos limitam por IP. No servidor da Vercel todo mundo
// compartilha o mesmo IP e o serviço de CEP (AwesomeAPI) devolvia "429 Too Many Requests"
// depois de 1 ou 2 consultas — por isso quase nenhuma empresa ganhava pin.
//
// Fonte: Photon (photon.komoot.io, base do OpenStreetMap) com o endereço da Receita
// (rua + número + cidade/UF). Cada resultado é conferido: precisa cair a no máximo 80 km
// da sede do município da empresa. O que já foi achado fica guardado neste navegador.
import { distanciaKm, MUNICIPIOS } from "./radius";

export type Coord = { lat: number; lng: number };
export type ItemLocalizar = { id: string; endereco: string | null; bairro?: string | null; cidade: string; uf: string };

const CHAVE_CACHE = "oraklo:geo:v1";
const MAX_DIST_DA_CIDADE_KM = 80;
const PARALELO = 8;

const semAcento = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

// ---------- cache no navegador ----------
let cache: Record<string, Coord | null> | null = null;
function lerCache() {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(CHAVE_CACHE) ?? "{}");
  } catch {
    cache = {};
  }
  return cache!;
}
let salvarTimer: ReturnType<typeof setTimeout> | undefined;
function salvarCache() {
  clearTimeout(salvarTimer);
  salvarTimer = setTimeout(() => {
    try {
      localStorage.setItem(CHAVE_CACHE, JSON.stringify(cache ?? {}));
    } catch {}
  }, 500);
}

// Sede do município (para conferir se o resultado faz sentido).
function sede(cidade: string, uf: string) {
  const c = semAcento(cidade);
  return MUNICIPIOS.find((m) => m.uf === uf && semAcento(m.name) === c) ?? null;
}

type PhotonFeature = { geometry?: { coordinates?: [number, number] }; properties?: { type?: string } };

async function photon(q: string, perto: Coord | null, sinal: AbortSignal): Promise<Coord | null> {
  const p = new URLSearchParams({ q, limit: "1", lang: "default" });
  // dá preferência a resultados perto da cidade da empresa
  if (perto) {
    p.set("lat", String(perto.lat));
    p.set("lon", String(perto.lng));
  }
  try {
    const r = await fetch(`https://photon.komoot.io/api/?${p}`, { signal: sinal });
    if (!r.ok) return null;
    const j = (await r.json()) as { features?: PhotonFeature[] };
    const f = j.features?.[0];
    const [lng, lat] = f?.geometry?.coordinates ?? [NaN, NaN];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (!["house", "street", "locality", "district"].includes(f?.properties?.type ?? "")) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/** Uma empresa: endereço completo; se não achar, só a rua + bairro. */
async function localizarUma(item: ItemLocalizar, sinal: AbortSignal): Promise<Coord | null> {
  const s = sede(item.cidade, item.uf);
  const perto = s ? { lat: s.lat, lng: s.lng } : null;
  const confere = (c: Coord | null) =>
    c && (!perto || distanciaKm(perto.lat, perto.lng, c.lat, c.lng) <= MAX_DIST_DA_CIDADE_KM) ? c : null;

  if (item.endereco) {
    const c1 = confere(await photon(`${item.endereco}, ${item.cidade}, ${item.uf}, Brasil`, perto, sinal));
    if (c1) return c1;
    // tenta sem o número/complemento (ex.: "Rodovia Antonio Heil, 4155, Andar 1" → "Rodovia Antonio Heil")
    const rua = item.endereco.split(",")[0];
    if (rua && rua !== item.endereco) {
      const c2 = confere(await photon(`${rua}, ${item.bairro ? `${item.bairro}, ` : ""}${item.cidade}, ${item.uf}`, perto, sinal));
      if (c2) return c2;
    }
  }
  return null;
}

/**
 * Localiza várias empresas, algumas por vez, chamando `aoAchar` a cada uma encontrada
 * (os pins aparecem no mapa aos poucos). Devolve quantas ficaram sem localização.
 */
export async function localizarEmpresas(
  itens: ItemLocalizar[],
  aoAchar: (id: string, c: Coord) => void,
  aoTerminarUma: () => void,
  sinal: AbortSignal,
) {
  const c = lerCache();
  const fila: ItemLocalizar[] = [];
  for (const item of itens) {
    const ja = c[item.id];
    if (ja) {
      aoAchar(item.id, ja);
      aoTerminarUma();
    } else fila.push(item);
  }
  let i = 0;
  async function trabalhador() {
    while (i < fila.length && !sinal.aborted) {
      const item = fila[i++];
      const coord = await localizarUma(item, sinal);
      if (sinal.aborted) return;
      if (coord) {
        c[item.id] = coord; // só guarda o que foi achado (falha de rede tenta de novo depois)
        salvarCache();
        aoAchar(item.id, coord);
      }
      aoTerminarUma();
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALELO, fila.length) }, trabalhador));
}
