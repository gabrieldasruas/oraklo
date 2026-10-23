// Portfólio do workspace: identidade, sobre, soluções, cases, clientes e o e-mail de apresentação.
// Fica salvo no banco como uma lista especial (tag PORTFOLIO_TAG) do workspace; os arquivos
// importados ficam em listas com a tag ARQUIVO_TAG. As duas tags ficam escondidas da página Listas.

import { cores } from "@/lib/colors";
export const PORTFOLIO_TAG = "__portfolio__";
export const ARQUIVO_TAG = "__portfolio_file__";
/** contador de visitas do link público */
export const VISITAS_TAG = "__portfolio_views__";
export const TAG_INTERNA = "__";

export type Solucao = { id: string; titulo: string; descricao: string; preco: string };
export type Case = { id: string; cliente: string; resultado: string; depoimento: string; autor: string };
export type Numero = { valor: string; rotulo: string };

export type Portfolio = {
  identidade: {
    nome: string;
    cargo: string;
    empresa: string;
    tagline: string;
    cidade: string;
    email: string;
    telefone: string;
    site: string;
    linkedin: string;
    /** cor de destaque da marca (hex) */
    cor: string;
    /** imagens pequenas em data URL (redimensionadas no navegador) */
    logo: string | null;
    foto: string | null;
  };
  sobre: { texto: string; especialidades: string[]; numeros: Numero[] };
  solucoes: Solucao[];
  cases: Case[];
  clientes: string[];
  email: { assunto: string; corpo: string };
  /** link público /p/[id] (com contagem de visitas) */
  compartilhar?: { ativo: boolean };
  atualizadoEm?: string;
};

export type ArquivoResumo = { id: string; nome: string; tipo: string; tamanho: number; criadoEm: string };

export const novoId = () => Math.random().toString(36).slice(2, 10);

export const PORTFOLIO_PADRAO: Portfolio = {
  identidade: {
    nome: "Seu nome",
    cargo: "Fundador(a)",
    empresa: "Sua empresa",
    tagline: "Soluções que fazem sua operação render mais",
    cidade: "Itajaí, SC",
    email: "contato@suaempresa.com.br",
    telefone: "(47) 99999-0000",
    site: "suaempresa.com.br",
    linkedin: "",
    cor: cores.neon,
    logo: null,
    foto: null,
  },
  sobre: {
    texto:
      "Conte em poucas linhas quem você é, há quanto tempo atua e por que as empresas confiam no seu trabalho. Esse texto aparece no portfólio e no e-mail de apresentação.",
    especialidades: ["Logística", "Consultoria", "Tecnologia"],
    numeros: [
      { valor: "+120", rotulo: "clientes atendidos" },
      { valor: "8 anos", rotulo: "de mercado" },
      { valor: "32%", rotulo: "de redução de custo médio" },
    ],
  },
  solucoes: [
    { id: "s1", titulo: "Diagnóstico da operação", descricao: "Mapeamos gargalos e custos escondidos em 2 semanas.", preco: "a partir de R$ 4.900" },
    { id: "s2", titulo: "Implantação", descricao: "Colocamos a solução para rodar com o seu time, sem parar a operação.", preco: "sob consulta" },
    { id: "s3", titulo: "Acompanhamento mensal", descricao: "Indicadores, ajustes e suporte contínuo.", preco: "R$ 1.900/mês" },
  ],
  cases: [
    { id: "c1", cliente: "Transportadora Exemplo", resultado: "-27% no custo por entrega em 3 meses", depoimento: "O diagnóstico pagou o projeto inteiro no primeiro mês.", autor: "Diretora de operações" },
  ],
  clientes: ["Cliente A", "Cliente B", "Cliente C", "Cliente D"],
  email: {
    assunto: "{minha_empresa} + {empresa}: uma ideia rápida",
    corpo:
      "Oi, {nome}! Tudo bem?\n\nSou {meu_nome}, da {minha_empresa}. Ajudamos empresas como a {empresa} com:\n{solucoes}\n\nPosso te mostrar em 15 minutos como isso funcionaria aí?\n\nAbraço,\n{meu_nome}\n{meu_telefone}",
  },
};

/** Junta o salvo com o padrão (campos novos ganham valor padrão). */
export function completar(p: Partial<Portfolio> | null | undefined): Portfolio {
  const d = PORTFOLIO_PADRAO;
  if (!p) return structuredClone(d);
  return {
    identidade: { ...d.identidade, ...(p.identidade ?? {}) },
    sobre: { ...d.sobre, ...(p.sobre ?? {}) },
    solucoes: p.solucoes ?? d.solucoes,
    cases: p.cases ?? d.cases,
    clientes: p.clientes ?? d.clientes,
    email: { ...d.email, ...(p.email ?? {}) },
    compartilhar: { ativo: !!p.compartilhar?.ativo },
    atualizadoEm: p.atualizadoEm,
  };
}

/** Preenche {variáveis} do e-mail para um lead. */
export function preencherEmail(texto: string, p: Portfolio, lead?: { name: string; company: string }) {
  const primeiro = lead?.name.split(" ")[0] ?? "{nome}";
  const vars: Record<string, string> = {
    nome: primeiro,
    empresa: lead?.company ?? "{empresa}",
    meu_nome: p.identidade.nome,
    minha_empresa: p.identidade.empresa,
    meu_telefone: p.identidade.telefone,
    meu_site: p.identidade.site,
    solucoes: p.solucoes.map((s) => `• ${s.titulo}${s.descricao ? ` — ${s.descricao}` : ""}`).join("\n"),
  };
  return texto.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m);
}

// ---------- CSV ----------

/** Lê CSV com vírgula ou ponto e vírgula (aspas suportadas). */
export function lerCsv(texto: string): string[][] {
  const limpo = texto.replace(/^﻿/, "");
  const primeira = limpo.split(/\r?\n/)[0] ?? "";
  const sep = (primeira.match(/;/g)?.length ?? 0) > (primeira.match(/,/g)?.length ?? 0) ? ";" : ",";
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let aspas = false;
  for (let i = 0; i < limpo.length; i++) {
    const ch = limpo[i];
    if (aspas) {
      if (ch === '"' && limpo[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (ch === '"') aspas = false;
      else campo += ch;
    } else if (ch === '"') aspas = true;
    else if (ch === sep) {
      linha.push(campo.trim());
      campo = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && limpo[i + 1] === "\n") i++;
      linha.push(campo.trim());
      if (linha.some(Boolean)) linhas.push(linha);
      linha = [];
      campo = "";
    } else campo += ch;
  }
  linha.push(campo.trim());
  if (linha.some(Boolean)) linhas.push(linha);
  return linhas;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

/**
 * Descobre o que o CSV traz pelos cabeçalhos:
 *  - soluções: titulo/solucao/servico/produto (+ descricao, preco)
 *  - cases: cliente + resultado (+ depoimento, autor)
 *  - clientes: só uma coluna de nomes (cliente/empresa/nome)
 */
export function interpretarCsv(linhas: string[][]): { solucoes: Solucao[]; cases: Case[]; clientes: string[] } {
  const vazio = { solucoes: [] as Solucao[], cases: [] as Case[], clientes: [] as string[] };
  if (linhas.length < 1) return vazio;
  const cab = linhas[0].map(norm);
  const col = (...nomes: string[]) => cab.findIndex((c) => nomes.some((n) => c.includes(n)));
  const dados = linhas.slice(1);

  const iTitulo = col("titulo", "solucao", "servico", "produto", "oferta");
  const iDesc = col("descricao", "detalhe", "resumo");
  const iPreco = col("preco", "valor", "investimento");
  const iCliente = col("cliente", "empresa", "marca");
  const iResultado = col("resultado", "impacto", "ganho");
  const iDepo = col("depoimento", "comentario", "frase");
  const iAutor = col("autor", "cargo", "quem");

  if (iCliente >= 0 && iResultado >= 0) {
    return {
      ...vazio,
      cases: dados
        .filter((l) => l[iCliente])
        .map((l) => ({ id: novoId(), cliente: l[iCliente], resultado: l[iResultado] ?? "", depoimento: iDepo >= 0 ? (l[iDepo] ?? "") : "", autor: iAutor >= 0 ? (l[iAutor] ?? "") : "" })),
    };
  }
  if (iTitulo >= 0) {
    return {
      ...vazio,
      solucoes: dados
        .filter((l) => l[iTitulo])
        .map((l) => ({ id: novoId(), titulo: l[iTitulo], descricao: iDesc >= 0 ? (l[iDesc] ?? "") : "", preco: iPreco >= 0 ? (l[iPreco] ?? "") : "" })),
    };
  }
  // uma coluna só: lista de clientes (com ou sem cabeçalho)
  const temCabecalho = iCliente >= 0 || cab[0] === "nome";
  const nomes = (temCabecalho ? dados : linhas).map((l) => l[Math.max(0, iCliente)]).filter(Boolean);
  return { ...vazio, clientes: nomes };
}
