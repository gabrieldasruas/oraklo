import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Escrita da abordagem com IA (Claude). Desligada até existir ANTHROPIC_API_KEY nas variáveis da Vercel.

export const iaConfigurada = () => Boolean(process.env.ANTHROPIC_API_KEY);

export type ModeloIA = "claude-opus-5-5" | "claude-sonnet-5-5" | "claude-haiku-5-5";

/**
 * Modelo de cada tarefa. Por token, o Haiku 5.5 custa cerca de 1/40 do Opus 5.5 e o Sonnet 5.5, metade.
 * Só troque depois de comparar a qualidade nos mesmos pedidos: `npm run comparar:ia`.
 */
export const MODELOS: Record<"abordagem" | "compradores", ModeloIA> = {
  abordagem: "claude-opus-5-5",
  compradores: "claude-opus-5-5",
};

/** Quando o modelo recusa, o servidor tenta outro (Opus e Sonnet 5.5). O Haiku 5.5 não tem esse recurso. */
export const opcoesFallback = (m: ModeloIA) =>
  m === "claude-haiku-5-5" ? {} : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

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
} as const;

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

// Quem compra o produto ("Quem compra o que eu vendo"), usado em app/(app)/portfolio/produtos.ts.
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
} as const;

export type Resultado = { ok: true; assunto: string; texto: string } | { ok: false; erro: string };

export async function escreverAbordagem(c: ContextoAbordagem): Promise<Resultado> {
  if (!iaConfigurada()) return { ok: false, erro: "Configure ANTHROPIC_API_KEY na Vercel para escrever com IA." };
  const client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
  try {
    const res = await client.beta.messages.create({
      model: MODELOS.abordagem,
      max_tokens: 4000,
      ...opcoesFallback(MODELOS.abordagem),
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA_ABORDAGEM } },
      system: SYSTEM_ABORDAGEM,
      messages: [{ role: "user", content: montarPedido(c) }],
    });
    if (res.stop_reason === "refusal") return { ok: false, erro: "A IA não conseguiu escrever essa mensagem. Tente mudar o pedido." };
    const bloco = res.content.find((b) => b.type === "text");
    if (!bloco || bloco.type !== "text") return { ok: false, erro: "A IA não devolveu texto. Tente de novo." };
    const json = JSON.parse(bloco.text) as { assunto?: string; texto?: string };
    if (!json.texto?.trim()) return { ok: false, erro: "A IA devolveu uma mensagem vazia. Tente de novo." };
    return { ok: true, assunto: (json.assunto ?? "").trim().slice(0, 200), texto: json.texto.trim().slice(0, 4000) };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { ok: false, erro: "Muitos pedidos agora. Tente em alguns segundos." };
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, erro: "A chave da IA é inválida. Confira ANTHROPIC_API_KEY." };
    if (err instanceof Anthropic.APIError) return { ok: false, erro: "A IA está indisponível agora. Tente de novo." };
    if (err instanceof SyntaxError) return { ok: false, erro: "Resposta da IA em formato inesperado. Tente de novo." };
    return { ok: false, erro: "Não foi possível falar com a IA." };
  }
}
