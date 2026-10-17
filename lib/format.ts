// Nomes da Receita vêm em caixa alta: "TRANSPORTES MARVEL S.A." → "Transportes Marvel S.A."
const LOWER = new Set(["de", "da", "do", "das", "dos", "e"]);
export function titleCase(name: string) {
  return name
    .toLowerCase()
    .split(" ")
    .map((w, i) => (w.includes(".") ? w.toUpperCase() : i > 0 && LOWER.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

export const formatCnpj = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
export const formatCnae = (c: string) => c.replace(/^(\d{4})(\d)(\d{2})$/, "$1-$2/$3");

export function formatPhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  return p;
}

export const formatMoney = (v: number | null) =>
  v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const SIZE_LABEL: Record<string, string> = {
  ME: "Microempresa",
  EPP: "Pequeno porte",
  DEMAIS: "Médio/grande porte",
  NAO_INFORMADO: "Não informado",
};
