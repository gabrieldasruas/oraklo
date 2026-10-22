// Perfil de cliente ideal: o que o usuário quer encontrar (nichos + preferências) e o que a busca
// aprendeu com os 👍/👎 e com as empresas mandadas ao pipeline. Guardado em `lists` (tag interna).
// Compartilhado entre servidor e cliente.
import { calcularScore, type DadosScore } from "./score";

export const PERFIL_TAG = "__perfil_busca__";

/** CNAEs (atividade principal) de cada nicho da Segmentação. Na busca só entram os que existem na base. */
export const CNAES_DO_NICHO: Record<string, string[]> = {
  "transportadoras-sc": ["4930202", "4930203", "4930204"],
  "armazens-logisticos": ["5211701", "5211702", "5211799"],
  "operacoes-transportes": ["5250804", "5250805", "5229099", "5320202"],
  "cargas-refrigeradas": ["4930202", "4930203"],
  "operadores-3pl": ["5250804", "5250805", "5211799"],
  metalmecanicas: ["2511000", "2512800", "2539001", "2599399"],
  "textil-sc": ["1321900", "1351100", "1412601", "1422300"],
  embalagens: ["1731100", "1732000", "1733800", "2222600"],
  "cooperativas-agricolas": ["0111302", "0115600", "4622200", "4623199"],
  "revendas-insumos": ["4683400", "4692300", "4661300"],
  atacadistas: ["4639701", "4691500", "4693100"],
  ecommerce: ["4713004", "4789099"],
  clinicas: ["8630503", "8630504", "8630501"],
  construtoras: ["4120400", "4299599", "4330499"],
  contabilidade: ["6920601", "6920602"],
};

export type Aprendizado = {
  cnaes: Record<string, number>;
  portes: Record<string, number>;
  cidades: Record<string, number>;
  /** último sinal por CNPJ: 1 = bom cliente, -1 = não é cliente */
  marcados: Record<string, 1 | -1>;
  sinais: number;
};

export type PerfilBusca = {
  nichos: string[];
  portes: string[];
  capitalMin: number | null;
  anosMin: number | null;
  temEmail: boolean;
  temWhatsapp: boolean;
  soMatriz: boolean;
  /** aplica o perfil automaticamente ao abrir a Busca avançada */
  ativo: boolean;
  aprendizado: Aprendizado;
  atualizadoEm?: string;
};

export const PERFIL_VAZIO: PerfilBusca = {
  nichos: [],
  portes: [],
  capitalMin: null,
  anosMin: null,
  temEmail: false,
  temWhatsapp: false,
  soMatriz: false,
  ativo: true,
  aprendizado: { cnaes: {}, portes: {}, cidades: {}, marcados: {}, sinais: 0 },
};

export function completarPerfil(p: Partial<PerfilBusca> | null | undefined): PerfilBusca {
  const v = PERFIL_VAZIO;
  if (!p) return structuredClone(v);
  const a = p.aprendizado ?? v.aprendizado;
  return {
    nichos: Array.isArray(p.nichos) ? p.nichos.filter((n) => typeof n === "string").slice(0, 30) : [],
    portes: Array.isArray(p.portes) ? p.portes.filter((x) => ["ME", "EPP", "DEMAIS"].includes(x)) : [],
    capitalMin: typeof p.capitalMin === "number" && p.capitalMin > 0 ? p.capitalMin : null,
    anosMin: typeof p.anosMin === "number" && p.anosMin > 0 ? Math.min(50, Math.round(p.anosMin)) : null,
    temEmail: !!p.temEmail,
    temWhatsapp: !!p.temWhatsapp,
    soMatriz: !!p.soMatriz,
    ativo: p.ativo !== false,
    aprendizado: { cnaes: { ...a.cnaes }, portes: { ...a.portes }, cidades: { ...a.cidades }, marcados: { ...a.marcados }, sinais: Number(a.sinais) || 0 },
    atualizadoEm: p.atualizadoEm,
  };
}

/** CNAEs de todos os nichos escolhidos. */
export const cnaesDoPerfil = (p: PerfilBusca) => [...new Set(p.nichos.flatMap((n) => CNAES_DO_NICHO[n] ?? []))];

/** Quantas preferências o perfil tem (para mostrar "perfil 4/6"). */
export function forcaDoPerfil(p: PerfilBusca) {
  const itens = [p.nichos.length > 0, p.portes.length > 0, p.capitalMin !== null, p.anosMin !== null, p.temEmail || p.temWhatsapp, p.aprendizado.sinais >= 5];
  return { feitos: itens.filter(Boolean).length, total: itens.length };
}

export type EmpresaPerfil = DadosScore & { cnpj: string; cnaeMain: string | null; city: string; uf: string };

const celular = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length === 11 && d[2] === "9";
};
const peso = (n: number | undefined) => Math.max(-3, Math.min(3, n ?? 0));

/**
 * Afinidade 0–100: quanto a empresa combina com o perfil do usuário.
 * Metade vem do score automático (qualidade do lead); o resto, do perfil e do que a busca aprendeu.
 */
export function afinidade(c: EmpresaPerfil, p: PerfilBusca): { valor: number; motivos: string[] } {
  const base = calcularScore(c).score;
  let s = base * 0.55;
  const motivos: string[] = [];
  const cnaes = cnaesDoPerfil(p);
  if (cnaes.length && c.cnaeMain && cnaes.includes(c.cnaeMain)) (s += 15), motivos.push("nicho que você foca");
  if (p.portes.length && p.portes.includes(c.size ?? "")) (s += 10), motivos.push("porte que você quer");
  if (p.capitalMin && (c.shareCapital ?? 0) >= p.capitalMin) (s += 5), motivos.push("capital acima do mínimo");
  if (p.anosMin && c.openedAt && (Date.now() - new Date(c.openedAt).getTime()) / (365.25 * 86_400_000) >= p.anosMin) (s += 5), motivos.push("tempo de mercado");
  if (p.temWhatsapp && c.phones.some(celular)) (s += 5), motivos.push("tem WhatsApp");
  if (p.temEmail && c.email) (s += 5), motivos.push("tem e-mail");
  // aprendizado: empresas parecidas com as que você aprovou sobem; com as que recusou, descem
  const a = p.aprendizado;
  const aprendido = peso(a.cnaes[c.cnaeMain ?? ""]) * 3 + peso(a.portes[c.size ?? ""]) * 2 + peso(a.cidades[`${c.city}|${c.uf}`]) * 1.5;
  if (aprendido > 0) motivos.push("parecida com as que você aprovou");
  if (aprendido < 0) motivos.push("parecida com as que você recusou");
  s += aprendido;
  const marcado = a.marcados[c.cnpj];
  if (marcado === 1) s += 10;
  if (marcado === -1) s -= 25;
  return { valor: Math.max(0, Math.min(100, Math.round(s))), motivos };
}

/** Atualiza o aprendizado com um sinal (+1 bom cliente, -1 não é cliente, 0 desfaz). */
export function aplicarSinal(p: PerfilBusca, c: Pick<EmpresaPerfil, "cnpj" | "cnaeMain" | "size" | "city" | "uf">, sinal: 1 | -1 | 0): PerfilBusca {
  const a = structuredClone(p.aprendizado);
  const anterior: number = a.marcados[c.cnpj] ?? 0;
  const delta = sinal - anterior;
  if (!delta) return p;
  const somar = (m: Record<string, number>, k: string | null) => {
    if (!k) return;
    m[k] = (m[k] ?? 0) + delta;
    if (!m[k]) delete m[k];
  };
  somar(a.cnaes, c.cnaeMain);
  somar(a.portes, c.size);
  somar(a.cidades, c.city ? `${c.city}|${c.uf}` : null);
  if (sinal) a.marcados[c.cnpj] = sinal;
  else delete a.marcados[c.cnpj];
  // guarda só os últimos 500 marcados
  const chaves = Object.keys(a.marcados);
  for (const k of chaves.slice(0, Math.max(0, chaves.length - 500))) delete a.marcados[k];
  a.sinais = Math.max(0, a.sinais + (anterior === 0 && sinal !== 0 ? 1 : anterior !== 0 && sinal === 0 ? -1 : 0));
  return { ...p, aprendizado: a };
}
