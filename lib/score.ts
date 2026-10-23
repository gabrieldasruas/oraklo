// Score automático do lead (0–100): o quanto a empresa vale a abordagem, só com dados da Receita.
// Usado ao adicionar empresas ao pipeline e mostrado nos resultados da busca.
import { cores } from "@/lib/colors";
import { tipoDoEmail } from "./crm";

export type DadosScore = {
  size: string | null;
  shareCapital: number | null;
  email: string | null;
  phones: string[];
  isHeadquarters: boolean;
  openedAt: string | null;
};

const celular = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length === 11 && d[2] === "9";
};

export function calcularScore(e: DadosScore): { score: number; motivos: string[] } {
  let s = 20;
  const motivos: string[] = [];

  // porte
  if (e.size === "DEMAIS") (s += 20), motivos.push("médio/grande porte");
  else if (e.size === "EPP") (s += 14), motivos.push("pequeno porte");
  else if (e.size === "ME") s += 8;

  // capital social
  const cap = e.shareCapital ?? 0;
  if (cap >= 1_000_000) (s += 20), motivos.push("capital acima de R$ 1 mi");
  else if (cap >= 100_000) (s += 12), motivos.push("capital acima de R$ 100 mil");
  else if (cap >= 10_000) s += 6;

  // contato
  if (e.email) {
    s += 10;
    if (!tipoDoEmail(e.email)) (s += 4), motivos.push("e-mail direto");
    else motivos.push("tem e-mail");
  }
  if (e.phones.some(celular)) (s += 10), motivos.push("WhatsApp");
  else if (e.phones.length) s += 5;

  // estrutura
  if (e.isHeadquarters) (s += 6), motivos.push("matriz");
  if (e.openedAt) {
    const anos = (Date.now() - new Date(e.openedAt).getTime()) / (365.25 * 86_400_000);
    if (anos >= 10) (s += 8), motivos.push(`${Math.floor(anos)} anos de mercado`);
    else if (anos >= 3) s += 4;
  }

  return { score: Math.max(0, Math.min(100, Math.round(s))), motivos };
}

/** Faixa do score para cor/rótulo. */
export const faixaScore = (n: number) => (n >= 75 ? { rotulo: "Quente", cor: cores["score-quente"] } : n >= 50 ? { rotulo: "Morno", cor: cores["score-morno"] } : { rotulo: "Frio", cor: cores["score-frio"] });
