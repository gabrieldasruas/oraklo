// Avisos de lead quente: agrupamento e textos (sem dependências, para usar no navegador e testar).

export type TipoAviso = "cotacao_recebida" | "produto_visto" | "portfolio_viewed" | "email_replied";

export type Aviso = {
  id: number;
  tipo: TipoAviso;
  leadId: string;
  nome: string;
  empresa: string;
  quando: string; // ISO
  produto?: string;
  itens?: number;
};

export type Grupo = { chave: string; leadId: string; nome: string; empresa: string; ultimo: string; avisos: Aviso[] };

export function haQuanto(iso: string, agora = Date.now()) {
  const min = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

/** Junta os sinais do mesmo lead que aconteceram perto (até 1 h entre eles) num aviso só. Espera os itens do mais novo para o mais antigo. */
export function agrupar(itens: Aviso[]): Grupo[] {
  const grupos: Grupo[] = [];
  for (const a of itens) {
    const g = grupos.find((x) => x.leadId === a.leadId && new Date(x.avisos[x.avisos.length - 1].quando).getTime() - new Date(a.quando).getTime() < 3_600_000);
    if (g) g.avisos.push(a);
    else grupos.push({ chave: `${a.leadId}-${a.id}`, leadId: a.leadId, nome: a.nome, empresa: a.empresa, ultimo: a.quando, avisos: [a] });
  }
  return grupos;
}

/** O que dizer de um grupo: o sinal mais forte manda (cotação > produtos > resposta > portfólio). */
export function resumoGrupo(g: Grupo): { tipo: TipoAviso; titulo: string; detalhe: string } {
  const cot = g.avisos.find((a) => a.tipo === "cotacao_recebida");
  const produtos = [...new Set(g.avisos.filter((a) => a.tipo === "produto_visto").map((a) => a.produto).filter(Boolean))] as string[];
  if (cot) {
    const n = cot.itens ?? 1;
    return { tipo: "cotacao_recebida", titulo: "pediu cotação pelo catálogo", detalhe: `${n} ${n === 1 ? "item" : "itens"}${produtos.length ? ` · viu ${produtos.slice(0, 2).join(", ")}` : ""}` };
  }
  if (produtos.length) {
    return {
      tipo: "produto_visto",
      titulo: produtos.length > 1 ? `está vendo ${produtos.length} produtos` : "está vendo seu catálogo",
      detalhe: produtos.slice(0, 3).join(", ") + (produtos.length > 3 ? ` +${produtos.length - 3}` : ""),
    };
  }
  if (g.avisos.some((a) => a.tipo === "email_replied")) return { tipo: "email_replied", titulo: "respondeu seu e-mail", detalhe: "Abra o lead e continue a conversa" };
  return { tipo: "portfolio_viewed", titulo: "abriu seu portfólio", detalhe: "Pelo link pessoal que você enviou" };
}
