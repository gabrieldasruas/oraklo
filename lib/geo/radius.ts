// Busca por raio: quais municípios brasileiros ficam dentro de um círculo no mapa.
// Cada empresa da Receita é ligada a um município (código SIAFI/TOM, o mesmo de
// `companies.municipality_code`), então o raio é aplicado pela posição da sede do município.
// Coordenadas: base pública do IBGE (github.com/kelvins/municipios-brasileiros).
import data from "./municipios.json";

export type Municipio = { code: string; name: string; uf: string; lat: number; lng: number };

export const MUNICIPIOS: Municipio[] = (data as [string, string, string, number, number][]).map(
  ([code, name, uf, lat, lng]) => ({ code, name, uf, lat, lng }),
);

/** Limites do mapa: só dá para navegar dentro do Brasil (com uma pequena folga). */
export const BRASIL_BOUNDS: [[number, number], [number, number]] = [
  [-34.5, -74.5],
  [6.0, -28.5],
];
export const BRASIL_CENTRO: [number, number] = [-14.5, -51.5];

export const RAIO_MIN_KM = 5;
export const RAIO_MAX_KM = 600;
/** Centro precisa estar a no máximo esta distância de alguma cidade brasileira (descarta mar e países vizinhos). */
const MAX_DIST_CIDADE_KM = 60;

const R_TERRA = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanciaKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_TERRA * Math.asin(Math.sqrt(h));
}

/** Cidade mais próxima de um ponto (para validar que o centro está no Brasil e nomear a região). */
export function cidadeMaisProxima(lat: number, lng: number) {
  let best = MUNICIPIOS[0];
  let dist = Infinity;
  for (const m of MUNICIPIOS) {
    const d = distanciaKm(lat, lng, m.lat, m.lng);
    if (d < dist) {
      dist = d;
      best = m;
    }
  }
  return { municipio: best, distanciaKm: dist };
}

export function centroNoBrasil(lat: number, lng: number) {
  return cidadeMaisProxima(lat, lng).distanciaKm <= MAX_DIST_CIDADE_KM;
}

/**
 * Municípios cuja sede está dentro do círculo, opcionalmente só de alguns estados.
 * Ordenados do mais próximo ao mais distante do centro.
 */
export function municipiosNoRaio(lat: number, lng: number, raioKm: number, ufs?: string[]) {
  const r = Math.min(RAIO_MAX_KM, Math.max(RAIO_MIN_KM, raioKm));
  const permitidas = ufs?.length ? new Set(ufs) : null;
  return MUNICIPIOS.map((m) => ({ ...m, distanciaKm: distanciaKm(lat, lng, m.lat, m.lng) }))
    .filter((m) => m.distanciaKm <= r && (!permitidas || permitidas.has(m.uf)))
    .sort((a, b) => a.distanciaKm - b.distanciaKm);
}

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;
