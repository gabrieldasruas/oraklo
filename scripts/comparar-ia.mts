// Compara Opus 5.5, Sonnet 5.5 e Haiku 5.5 nas tarefas de IA do app, com os mesmos prompts de lib/ia.ts.
// Gera um relatório em Markdown com os textos lado a lado, o custo de cada chamada e se o JSON veio válido.
//
// Uso: npm run comparar:ia [-- --saida=relatorio.md]
// Gasta créditos da ANTHROPIC_API_KEY: cerca de 30 chamadas curtas (centavos de dólar no total).

import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { SCHEMA_ABORDAGEM, SCHEMA_COMPRADORES, SYSTEM_ABORDAGEM, SYSTEM_COMPRADORES, montarPedido, opcoesFallback, type ContextoAbordagem, type ModeloIA } from "../lib/ia.ts";

const MODELOS: ModeloIA[] = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];
// US$ por milhão de tokens (entrada, saída)
const PRECO: Record<ModeloIA, [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
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

const client = new Anthropic({ timeout: 60_000, maxRetries: 2 });

type Saida = { texto: string; jsonOk: boolean; custo: number; ms: number; tokens: string };

async function chamar(modelo: ModeloIA, system: string, user: string, schema: object, maxTokens: number): Promise<Saida> {
  const t0 = Date.now();
  try {
    const res = await client.beta.messages.create({
      model: modelo,
      max_tokens: maxTokens,
      ...opcoesFallback(modelo),
      output_config: { effort: "low", format: { type: "json_schema", schema: schema as Record<string, unknown> } },
      system,
      messages: [{ role: "user", content: user }],
    });
    const bloco = res.content.find((b) => b.type === "text");
    const texto = bloco && bloco.type === "text" ? bloco.text : `(sem texto; stop_reason=${res.stop_reason})`;
    let jsonOk = true;
    try {
      JSON.parse(texto);
    } catch {
      jsonOk = false;
    }
    const [pin, pout] = PRECO[modelo];
    const custo = (res.usage.input_tokens * pin + res.usage.output_tokens * pout) / 1e6;
    return { texto, jsonOk, custo, ms: Date.now() - t0, tokens: `${res.usage.input_tokens} in / ${res.usage.output_tokens} out` };
  } catch (e) {
    const msg = e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : String(e);
    return { texto: `ERRO: ${msg}`, jsonOk: false, custo: 0, ms: Date.now() - t0, tokens: "-" };
  }
}

const formatar = (texto: string) => {
  try {
    const j = JSON.parse(texto) as { assunto?: string; texto?: string; compradores?: { code: string; descricao: string }[] };
    if (j.compradores) return j.compradores.map((c) => `- ${c.code} · ${c.descricao}`).join("\n");
    return [j.assunto ? `**Assunto:** ${j.assunto}` : "", j.texto ?? ""].filter(Boolean).join("\n\n");
  } catch {
    return "```\n" + texto + "\n```";
  }
};

const linhas: string[] = ["# Comparação de modelos de IA", "", `Gerado em ${new Date().toLocaleString("pt-BR")}. Effort \`low\`, mesmos prompts de \`lib/ia.ts\`.`, ""];
const total: Record<string, { custo: number; ms: number; n: number; json: number }> = Object.fromEntries(MODELOS.map((m) => [m, { custo: 0, ms: 0, n: 0, json: 0 }]));

async function caso(titulo: string, system: string, user: string, schema: object, maxTokens: number) {
  console.log(titulo);
  linhas.push(`## ${titulo}`, "");
  const resultados = await Promise.all(MODELOS.map((m) => chamar(m, system, user, schema, maxTokens)));
  MODELOS.forEach((m, i) => {
    const r = resultados[i];
    Object.assign(total[m], { custo: total[m].custo + r.custo, ms: total[m].ms + r.ms, n: total[m].n + 1, json: total[m].json + (r.jsonOk ? 1 : 0) });
    linhas.push(`### ${m}`, "", `_${r.tokens} · US$ ${r.custo.toFixed(5)} · ${(r.ms / 1000).toFixed(1)} s${r.jsonOk ? "" : " · **JSON inválido**"}_`, "", formatar(r.texto), "");
  });
}

for (const a of ABORDAGENS) await caso(`Abordagem: ${a.nome}`, SYSTEM_ABORDAGEM, montarPedido(a.c), SCHEMA_ABORDAGEM, 4000);
for (const p of PRODUTOS) await caso(`Compradores: ${p.nome}`, SYSTEM_COMPRADORES, `Produto: ${p.nome}\nDescrição: ${p.descricao}\nCategoria: ${p.categoria}`, SCHEMA_COMPRADORES, 3000);

linhas.splice(4, 0, "| Modelo | Custo total (US$) | Custo médio por chamada | Tempo médio | JSON válido |", "|---|---|---|---|---|", ...MODELOS.map((m) => {
  const t = total[m];
  return `| ${m} | ${t.custo.toFixed(4)} | ${(t.custo / t.n).toFixed(5)} | ${(t.ms / t.n / 1000).toFixed(1)} s | ${t.json}/${t.n} |`;
}), "");

const saida = process.argv.find((a) => a.startsWith("--saida="))?.split("=")[1] ?? "comparacao-ia.md";
fs.writeFileSync(saida, linhas.join("\n"));
console.log(`Relatório em ${saida}`);
