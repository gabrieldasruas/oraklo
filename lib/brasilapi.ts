import "server-only";
import { createAdminClient } from "./db/admin";

// BrasilAPI (https://brasilapi.com.br), sem chave. Os termos proíbem varredura automatizada:
// consulte só quando uma PESSOA abre a empresa (ficha logada), nunca em lote nem em página pública
// que o Google rastreia. Cache em `company_tax_info` por 30 dias. Nunca lança: na falha, a tela segue sem o dado.

export type Regime = { regime: string; ano: number | null };

const VALIDADE_MS = 30 * 86_400_000;
const TEMPO_MS = 3000;

type RespostaCnpj = {
  opcao_pelo_simples?: boolean | null;
  opcao_pelo_mei?: boolean | null;
  regime_tributario?: { ano: number; forma_de_tributacao: string | null }[] | null;
};

/** Simples/MEI primeiro (essas empresas não entregam a ECF); senão, a forma de tributação do último ano. */
function lerRegime(r: RespostaCnpj): Regime | null {
  if (r.opcao_pelo_mei) return { regime: "MEI", ano: null };
  if (r.opcao_pelo_simples) return { regime: "SIMPLES NACIONAL", ano: null };
  const ultimo = (r.regime_tributario ?? []).filter((x) => x.forma_de_tributacao).sort((a, b) => b.ano - a.ano)[0];
  return ultimo ? { regime: ultimo.forma_de_tributacao!.toUpperCase(), ano: ultimo.ano } : null;
}

const doCache = (l: { regime: string | null; regime_year: number | null } | null): Regime | null =>
  l?.regime ? { regime: l.regime, ano: l.regime_year } : null;

/** Regime guardado no cache, sem consultar a BrasilAPI (para usos em lote, como o score ao adicionar ao pipeline). */
export async function regimesEmCache(cnpjs: string[]): Promise<Map<string, Regime>> {
  const out = new Map<string, Regime>();
  if (!cnpjs.length) return out;
  try {
    const { data } = await createAdminClient().from("company_tax_info").select("cnpj, regime, regime_year").in("cnpj", cnpjs.slice(0, 300));
    for (const l of data ?? []) {
      const r = doCache(l);
      if (r) out.set(String(l.cnpj).trim(), r);
    }
  } catch {
    // sem cache: o score segue sem o regime
  }
  return out;
}

/** Regime da empresa para a ficha: cache de 30 dias; se vencido, consulta a BrasilAPI (até 3 s). */
export async function regimeDaEmpresa(cnpj: string): Promise<Regime | null> {
  if (!/^\d{14}$/.test(cnpj)) return null;
  let db: ReturnType<typeof createAdminClient>;
  let cache: { regime: string | null; regime_year: number | null; fetched_at: string } | null = null;
  try {
    db = createAdminClient();
    const { data } = await db.from("company_tax_info").select("regime, regime_year, fetched_at").eq("cnpj", cnpj).maybeSingle();
    cache = data;
    if (cache && Date.now() - new Date(cache.fetched_at).getTime() < VALIDADE_MS) return doCache(cache);
  } catch {
    return null;
  }
  try {
    // Sem User-Agent próprio a BrasilAPI responde 403 (o padrão do fetch do Node é bloqueado)
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      signal: AbortSignal.timeout(TEMPO_MS),
      cache: "no-store",
      headers: { "User-Agent": "Oraklo/1.0 (+https://oraklo.vercel.app)" },
    });
    // 404 = a BrasilAPI não conhece o CNPJ: guarda vazio para não perguntar de novo por 30 dias
    if (!res.ok && res.status !== 404) {
      console.warn(`[brasilapi] HTTP ${res.status} no CNPJ ${cnpj}`);
      return doCache(cache);
    }
    const regime = res.ok ? lerRegime((await res.json()) as RespostaCnpj) : null;
    await db.from("company_tax_info").upsert({ cnpj, regime: regime?.regime ?? null, regime_year: regime?.ano ?? null, fetched_at: new Date().toISOString() });
    return regime;
  } catch {
    return doCache(cache); // fora do ar ou lenta: usa o que tiver (mesmo vencido)
  }
}

/** Rótulo para a tela: "Lucro Real (2024)", "Simples Nacional". */
export function rotuloRegime(r: Regime) {
  const nome = r.regime
    .toLowerCase()
    .replace(/(^|\s)\S/g, (l) => l.toUpperCase())
    .replace(/\b(Do|Da|De|Irpj)\b/g, (p) => (p === "Irpj" ? "IRPJ" : p.toLowerCase()))
    .replace(/^Mei$/, "MEI");
  return r.ano ? `${nome} (${r.ano})` : nome;
}
