// Compara modelos da OpenAI nas tarefas de IA do app, com os mesmos prompts e a mesma chamada de lib/ia.ts.
// Gera um relatório em Markdown com os textos lado a lado e o custo de cada chamada.
//
// Uso: npm run comparar:ia [-- --saida=relatorio.md]
// Gasta créditos da OPENAI_API_KEY: cerca de 27 chamadas curtas (centavos de dólar no total).

import fs from "node:fs";
import { SCHEMA_ABORDAGEM, SCHEMA_COMPRADORES, SYSTEM_ABORDAGEM, SYSTEM_COMPRADORES, gerarJson, montarPedido, pedidoCompradores, type ContextoAbordagem, type ModeloIA } from "../lib/ia.ts";

const MODELOS: ModeloIA[] = ["gpt-6.1-sol", "gpt-6.1-terra", "gpt-6-luna"];
// US$ por milhão de tokens (entrada, saída), tabela padrão da OpenAI em nov/2026
const PRECO: Record<ModeloIA, [number, number]> = {
  "gpt-6.1-sol": [2, 10],
  "gpt-6.1-terra": [1, 5],
  "gpt-6-luna": [0.1, 0.5],
};

const remetente = {
  nome: "Carla Mendes",
  empresa: "Rota Certa Rastreamento",
  tagline: "rastreamento e telemetria para frotas",
  solucoes: ["Rastreamento de caminhões em tempo real", "Relatórios de consumo de combustível por motorista"],
  cases: ["Transportes Vale Verde: reduziu 12% do consumo de diesel em 6 meses"],
  temLinkPortfolio: true,
};

const ABORDAGENS: { nome: string; c: ContextoAbordagem }[] = [
  {
    nome: "E-mail · transportadora média",
    c: { canal: "email", modelo: false, lead: { nome: "Ricardo Souza", cargo: "Sócio-administrador", empresa: "Transportes Litoral", cidade: "Itajaí/SC" }, empresa: { atividade: "Transporte rodoviário de carga intermunicipal", porte: "Empresa de pequeno porte", anos: 14, capital: "R$ 800 mil", matriz: true }, remetente },
  },
  {
    nome: "WhatsApp · transportadora pequena",
    c: { canal: "whatsapp", modelo: false, lead: { nome: "Joana Kunz", cargo: "", empresa: "JK Cargas", cidade: "Blumenau/SC" }, empresa: { atividade: "Transporte rodoviário de carga municipal", porte: "Microempresa", anos: 3, capital: "R$ 60 mil", matriz: true }, remetente },
  },
  {
    nome: "E-mail · modelo para disparo",
    c: { canal: "email", modelo: true, lead: { nome: "", cargo: "", empresa: "", cidade: "" }, remetente },
  },
  {
    nome: "E-mail · pedido do usuário",
    c: { canal: "email", modelo: false, lead: { nome: "Marcos Pereira", cargo: "Diretor", empresa: "Expresso Serra Azul", cidade: "Lages/SC" }, empresa: { atividade: "Transporte rodoviário de produtos perigosos", porte: "Demais", anos: 25, capital: "R$ 12 milhões", matriz: true }, remetente, instrucao: "Mencione segurança no transporte de carga perigosa e seja breve." },
  },
  {
    nome: "WhatsApp · filial",
    c: { canal: "whatsapp", modelo: false, lead: { nome: "Paulo Henrique", cargo: "Gerente", empresa: "Rodonaves Joinville", cidade: "Joinville/SC" }, empresa: { atividade: "Transporte rodoviário de carga intermunicipal", porte: "Demais", anos: 30, capital: null, matriz: false }, remetente },
  },
];

const PRODUTOS = [
  { nome: "Pneu 295/80 R22.5 para caminhão", descricao: "Pneu radial de carga, linha rodoviária", categoria: "Autopeças" },
  { nome: "Café torrado em grãos 1 kg", descricao: "Café especial de Minas, torra média", categoria: "Alimentos" },
  { nome: "Luva nitrílica descartável (caixa com 100)", descricao: "Sem pó, tamanhos P a GG", categoria: "Saúde" },
  { nome: "Software de emissão de nota fiscal", descricao: "NF-e e NFS-e na nuvem, plano mensal", categoria: "Tecnologia" },
];

const formatar = (d: { assunto?: string; texto?: string; compradores?: { code: string; descricao: string }[] }) =>
  d.compradores ? d.compradores.map((c) => `- ${c.code} · ${c.descricao}`).join("\n") : [d.assunto ? `**Assunto:** ${d.assunto}` : "", d.texto ?? ""].filter(Boolean).join("\n\n");

const linhas: string[] = ["# Comparação de modelos de IA", "", `Gerado em ${new Date().toLocaleString("pt-BR")}. Mesmos prompts e mesma chamada de \`lib/ia.ts\` (reasoning effort \`low\`).`, ""];
const total: Record<string, { custo: number; ms: number; n: number; ok: number }> = Object.fromEntries(MODELOS.map((m) => [m, { custo: 0, ms: 0, n: 0, ok: 0 }]));

async function caso(titulo: string, instrucoes: string, pedido: string, schema: Record<string, unknown>, nome: string) {
  console.log(titulo);
  linhas.push(`## ${titulo}`, "");
  const resultados = await Promise.all(
    MODELOS.map(async (modelo) => {
      const t0 = Date.now();
      const r = await gerarJson<Parameters<typeof formatar>[0]>({ modelo, instrucoes, pedido, schema, nome });
      return { r, ms: Date.now() - t0 };
    }),
  );
  MODELOS.forEach((m, i) => {
    const { r, ms } = resultados[i];
    const [pin, pout] = PRECO[m];
    const custo = r.ok ? (r.uso.entrada * pin + r.uso.saida * pout) / 1e6 : 0;
    Object.assign(total[m], { custo: total[m].custo + custo, ms: total[m].ms + ms, n: total[m].n + 1, ok: total[m].ok + (r.ok ? 1 : 0) });
    const meta = r.ok ? `${r.uso.entrada} in / ${r.uso.saida} out · US$ ${custo.toFixed(5)} · ${(ms / 1000).toFixed(1)} s` : `erro · ${(ms / 1000).toFixed(1)} s`;
    linhas.push(`### ${m}`, "", `_${meta}_`, "", r.ok ? formatar(r.dados) : `**${r.erro}**`, "");
  });
}

for (const a of ABORDAGENS) await caso(`Abordagem: ${a.nome}`, SYSTEM_ABORDAGEM, montarPedido(a.c), SCHEMA_ABORDAGEM, "abordagem");
for (const p of PRODUTOS) await caso(`Compradores: ${p.nome}`, SYSTEM_COMPRADORES, pedidoCompradores(p), SCHEMA_COMPRADORES, "compradores");

linhas.splice(4, 0, "| Modelo | Custo total (US$) | Custo médio por chamada | Tempo médio | Respostas válidas |", "|---|---|---|---|---|", ...MODELOS.map((m) => {
  const t = total[m];
  return `| ${m} | ${t.custo.toFixed(4)} | ${(t.custo / Math.max(1, t.ok)).toFixed(5)} | ${(t.ms / t.n / 1000).toFixed(1)} s | ${t.ok}/${t.n} |`;
}), "");

const saida = process.argv.find((a) => a.startsWith("--saida="))?.split("=")[1] ?? "comparacao-ia.md";
fs.writeFileSync(saida, linhas.join("\n"));
console.log(`Relatório em ${saida}`);
