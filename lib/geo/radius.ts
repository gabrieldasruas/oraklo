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
 * Municípios dentro do círculo, opcionalmente só de alguns estados, do mais próximo ao mais distante.
 * Entram as cidades cuja sede está no raio e, sempre, a cidade onde está o centro
 * (assim um raio pequeno longe da sede não fica vazio).
 */
export function municipiosNoRaio(lat: number, lng: number, raioKm: number, ufs?: string[]) {
  const r = Math.min(RAIO_MAX_KM, Math.max(RAIO_MIN_KM, raioKm));
  const permitidas = ufs?.length ? new Set(ufs) : null;
  const todas = MUNICIPIOS.map((m) => ({ ...m, distanciaKm: distanciaKm(lat, lng, m.lat, m.lng) })).sort(
    (a, b) => a.distanciaKm - b.distanciaKm,
  );
  const doCentro = todas[0];
  return todas.filter((m) => (m.distanciaKm <= r || m === doCentro) && (!permitidas || permitidas.has(m.uf)));
}

/** Onde a busca acontece: dentro do raio, só na cidade do centro, ou no estado inteiro. */
export type Escopo = "raio" | "cidade" | "estado";

/** Nome e centro aproximado de cada estado (para "buscar em outro estado"). */
export const ESTADOS: Record<string, { nome: string; lat: number; lng: number }> = Object.fromEntries(
  (
    [
      ["RO", "Rondônia", -10.83, -63.34], ["AC", "Acre", -8.77, -70.55], ["AM", "Amazonas", -3.47, -65.1],
      ["RR", "Roraima", 1.99, -61.33], ["PA", "Pará", -3.79, -52.48], ["AP", "Amapá", 1.41, -51.77],
      ["TO", "Tocantins", -9.46, -48.26], ["MA", "Maranhão", -5.42, -45.44], ["PI", "Piauí", -6.6, -42.28],
      ["CE", "Ceará", -5.2, -39.53], ["RN", "Rio Grande do Norte", -5.81, -36.59], ["PB", "Paraíba", -7.28, -36.72],
      ["PE", "Pernambuco", -8.38, -37.86], ["AL", "Alagoas", -9.62, -36.82], ["SE", "Sergipe", -10.57, -37.45],
      ["BA", "Bahia", -13.29, -41.71], ["MG", "Minas Gerais", -18.1, -44.38], ["ES", "Espírito Santo", -19.19, -40.34],
      ["RJ", "Rio de Janeiro", -22.25, -42.66], ["SP", "São Paulo", -22.19, -48.79], ["PR", "Paraná", -24.89, -51.55],
      ["SC", "Santa Catarina", -27.45, -50.95], ["RS", "Rio Grande do Sul", -30.17, -53.5],
      ["MS", "Mato Grosso do Sul", -20.51, -54.54], ["MT", "Mato Grosso", -12.64, -55.42], ["GO", "Goiás", -15.98, -49.86],
      ["DF", "Distrito Federal", -15.83, -47.86],
    ] as [string, string, number, number][]
  ).map(([uf, nome, lat, lng]) => [uf, { nome, lat, lng }]),
);

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
] as const;
