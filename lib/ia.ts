import "server-only";
import OpenAI from "openai";

// IA do app (OpenAI, Responses API com saída em JSON Schema). Desligada até existir OPENAI_API_KEY nas variáveis da Vercel.

export const iaConfigurada = () => Boolean(process.env.OPENAI_API_KEY);

export type ModeloIA = "gpt-6-luna" | "gpt-6.1-terra" | "gpt-6.1-sol";
export type TarefaIA = "abordagem" | "compradores";

/**
 * Modelo de cada tarefa. Preço por milhão de tokens (entrada/saída): luna US$ 0,10/0,50 · terra US$ 1/5 · sol US$ 2/10.
 * Escrever e-mail é tarefa simples; sugerir compradores exige conhecer a tabela CNAE.
 * Antes de trocar, compare a qualidade nos mesmos pedidos: `npm run comparar:ia`.
 */
export const MODELOS: Record<TarefaIA, ModeloIA> = {
  abordagem: "gpt-6.1-terra",
  compradores: "gpt-6.1-sol",
};

export type UsoIA = { modelo: ModeloIA; entrada: number; saida: number };
export type RespostaIA<T> = { ok: true; dados: T; uso: UsoIA } | { ok: false; erro: string };

/** Uma chamada com saída garantida no formato do schema (Structured Outputs, `strict`). */
export async function gerarJson<T>(o: { modelo: ModeloIA; instrucoes: string; pedido: string; schema: Record<string, unknown>; nome: string; maxTokens?: number }): Promise<RespostaIA<T>> {
  if (!iaConfigurada()) return { ok: false, erro: "A IA ainda não está ligada (falta a chave OPENAI_API_KEY)." };
  const client = new OpenAI({ timeout: 60_000, maxRetries: 1 });
  try {
    const res = await client.responses.create({
      model: o.modelo,
      instructions: o.instrucoes,
      input: o.pedido,
      max_output_tokens: o.maxTokens ?? 4000,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: o.nome, schema: o.schema, strict: true } },
    });
    const recusou = res.output.some((item) => item.type === "message" && item.content.some((p) => p.type === "refusal"));
    if (recusou) return { ok: false, erro: "A IA não conseguiu fazer esse pedido. Tente mudar o texto." };
    if (res.status === "incomplete") return { ok: false, erro: "A resposta da IA veio incompleta. Tente de novo." };
    if (!res.output_text) return { ok: false, erro: "A IA não devolveu texto. Tente de novo." };
    return { ok: true, dados: JSON.parse(res.output_text) as T, uso: { modelo: o.modelo, entrada: res.usage?.input_tokens ?? 0, saida: res.usage?.output_tokens ?? 0 } };
  } catch (err) {
    if (err instanceof OpenAI.RateLimitError) return { ok: false, erro: "Muitos pedidos agora. Tente em alguns segundos." };
    if (err instanceof OpenAI.AuthenticationError) return { ok: false, erro: "A chave da IA é inválida. Confira OPENAI_API_KEY." };
    if (err instanceof OpenAI.APIError) return { ok: false, erro: "A IA está indisponível agora. Tente de novo." };
    if (err instanceof SyntaxError) return { ok: false, erro: "Resposta da IA em formato inesperado. Tente de novo." };
    return { ok: false, erro: "Não foi possível falar com a IA." };
  }
}

// Abordagem (e-mail e WhatsApp para o lead) ---------------------------------------

export type ContextoAbordagem = {
  canal: "email" | "whatsapp";
  /** true = usar {nome} e {empresa} no lugar dos dados do lead (modelo para disparo em massa) */
  modelo: boolean;
  lead: { nome: string; cargo: string; empresa: string; cidade: string };
  empresa?: { atividade: string | null; porte: string | null; anos: number | null; capital: string | null; matriz: boolean | null } | null;
  remetente: { nome: string; empresa: string; tagline: string; solucoes: string[]; cases: string[]; temLinkPortfolio: boolean };
  instrucao?: string;
};

export const SYSTEM_ABORDAGEM = `Você escreve mensagens de prospecção B2B em português do Brasil para pequenas e médias empresas.
Escreva como uma pessoa real: direta, cordial, sem exageros nem jargão de marketing, sem emojis em e-mail.
Conecte o que o remetente oferece ao contexto da empresa do lead (atividade, porte, cidade) com uma ideia concreta.
Termine com um único pedido simples (uma conversa de 15 minutos ou uma resposta curta). Nunca invente números, clientes ou resultados que não estejam no contexto.
E-mail: assunto curto (até 60 caracteres) e corpo de 60 a 120 palavras, com saudação e assinatura com o nome do remetente.
WhatsApp: 2 a 4 frases curtas, tom de conversa, sem assunto.`;

export const SCHEMA_ABORDAGEM = {
  type: "object",
  properties: {
    assunto: { type: "string", description: "Assunto do e-mail (vazio para WhatsApp)" },
    texto: { type: "string", description: "Corpo da mensagem pronto para enviar" },
  },
  required: ["assunto", "texto"],
  additionalProperties: false,
};

export function montarPedido(c: ContextoAbordagem) {
  const e = c.empresa;
  const linhas = [
    `Canal: ${c.canal === "email" ? "e-mail" : "WhatsApp"}.`,
    c.modelo
      ? "Escreva um MODELO para vários leads: use exatamente {nome} para o primeiro nome do contato e {empresa} para o nome da empresa. Não cite nomes reais."
      : `Lead: ${c.lead.nome}${c.lead.cargo ? `, ${c.lead.cargo}` : ""}, da ${c.lead.empresa}${c.lead.cidade ? ` (${c.lead.cidade})` : ""}.`,
    e
      ? `Empresa do lead (dados públicos): atividade ${e.atividade ?? "não informada"}; porte ${e.porte ?? "não informado"}${e.anos !== null ? `; ${e.anos} anos de mercado` : ""}${e.capital ? `; capital social ${e.capital}` : ""}${e.matriz === false ? "; é filial" : ""}.`
      : "",
    `Remetente: ${c.remetente.nome}, da ${c.remetente.empresa}${c.remetente.tagline ? ` — ${c.remetente.tagline}` : ""}.`,
    c.remetente.solucoes.length ? `O que oferece: ${c.remetente.solucoes.join("; ")}.` : "",
    c.remetente.cases.length ? `Resultados reais que pode citar: ${c.remetente.cases.join("; ")}.` : "",
    c.remetente.temLinkPortfolio ? "Se fizer sentido, inclua {link_portfolio} (link da apresentação) numa frase." : "",
    c.instrucao?.trim() ? `Pedido do usuário: ${c.instrucao.trim().slice(0, 400)}` : "",
  ];
  return linhas.filter(Boolean).join("\n");
}

export type Resultado = { ok: true; assunto: string; texto: string } | { ok: false; erro: string };

export async function escreverAbordagem(c: ContextoAbordagem): Promise<Resultado> {
  const r = await gerarJson<{ assunto?: string; texto?: string }>({
    modelo: MODELOS.abordagem,
    instrucoes: SYSTEM_ABORDAGEM,
    pedido: montarPedido(c),
    schema: SCHEMA_ABORDAGEM,
    nome: "abordagem",
  });
  if (!r.ok) return r;
  if (!r.dados.texto?.trim()) return { ok: false, erro: "A IA devolveu uma mensagem vazia. Tente de novo." };
  return { ok: true, assunto: (r.dados.assunto ?? "").trim().slice(0, 200), texto: r.dados.texto.trim().slice(0, 4000) };
}

// Quem compra o produto ("Quem compra o que eu vendo"), usado em app/(app)/portfolio/produtos.ts ---------

export const SYSTEM_COMPRADORES =
  "Você é especialista em vendas B2B no Brasil e na classificação CNAE 2.3 do IBGE. Dado um produto, liste de 4 a 10 tipos de empresa que compram esse produto para revender, usar na operação ou transformar. Use subclasses CNAE reais com 7 dígitos. Prefira o varejo e os serviços que compram de distribuidores; não liste quem fabrica o próprio produto.";

export const SCHEMA_COMPRADORES = {
  type: "object",
  properties: {
    compradores: {
      type: "array",
      description: "Tipos de empresa que compram o produto, do mais provável para o menos",
      items: {
        type: "object",
        properties: {
          code: { type: "string", description: "Subclasse CNAE 2.3 com 7 dígitos, sem pontuação (ex.: 5611201)" },
          descricao: { type: "string", description: "Nome curto do tipo de comprador (ex.: Restaurantes)" },
        },
        required: ["code", "descricao"],
        additionalProperties: false,
      },
    },
  },
  required: ["compradores"],
  additionalProperties: false,
};

export const pedidoCompradores = (p: { nome: string; descricao: string; categoria: string }) =>
  `Produto: ${p.nome}\nDescrição: ${p.descricao || "não informada"}\nCategoria: ${p.categoria || "não informada"}`;
