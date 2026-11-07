"use server";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/db/server";
import { getFacets } from "@/lib/companies";
import { MODELOS, SCHEMA_COMPRADORES, SYSTEM_COMPRADORES, escreverAbordagem, gerarJson, iaConfigurada, pedidoCompradores } from "@/lib/ia";
import { LIMITES, NOME_PLANO, planoDoWorkspace, restante, usoDoMes } from "@/lib/planos";
import { PORTFOLIO_TAG, completar, type Portfolio } from "@/lib/portfolio-types";
import { carregarConfig, salvarConfig } from "@/app/(app)/configuracoes/actions";
import { MAX_COMPRADORES, MAX_FOTO_BYTES, PRODUTO_TAG, formatarPreco, type Comprador, type Produto, type ProdutoEntrada } from "@/lib/produtos";

// Catálogo de produtos ("Quem compra o que eu vendo"). Cada produto é uma linha de `lists` com tag interna;
// o RLS isola o workspace. Server Actions são endpoints públicos: cada uma confere a sessão.
// Erros voltam como { ok: false, erro } (em produção o Next esconde a mensagem de exceções).

type Falha = { ok: false; erro: string };

const limpar = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");

function normalizar(e: ProdutoEntrada, atual?: Produto): Omit<Produto, "id"> {
  const agora = new Date().toISOString();
  const preco = typeof e.preco === "number" && Number.isFinite(e.preco) && e.preco >= 0 ? Math.round(e.preco * 100) / 100 : null;
  const compradores = (Array.isArray(e.compradores) ? e.compradores : [])
    .filter((c) => /^\d{7}$/.test(String(c?.code)))
    .slice(0, MAX_COMPRADORES)
    .map((c) => ({ code: String(c.code), descricao: limpar(c.descricao, 90) || `CNAE ${c.code}` }));
  return {
    nome: limpar(e.nome, 90),
    descricao: limpar(e.descricao, 280),
    categoria: limpar(e.categoria, 30) || "outro",
    preco,
    unidade: limpar(e.unidade, 30),
    pedidoMinimo: limpar(e.pedidoMinimo, 60),
    mostrarPreco: e.mostrarPreco !== false,
    publico: e.publico !== false,
    foto: typeof e.foto === "string" && e.foto.startsWith("data:image/") ? e.foto : null,
    compradores,
    compradoresFonte: e.compradoresFonte === "ia" || e.compradoresFonte === "manual" ? e.compradoresFonte : "tabela",
    criadoEm: atual?.criadoEm ?? agora,
    atualizadoEm: agora,
  };
}

const deLinha = (r: { id: string; filter: unknown }): Produto => ({ ...(r.filter as Omit<Produto, "id">), id: r.id });

export async function listarProdutos(): Promise<Produto[]> {
  await requireUser();
  const db = await createClient();
  const { data, error } = await db.from("lists").select("id, filter").eq("tag", PRODUTO_TAG).order("created_at");
  if (error) return [];
  return (data ?? []).map(deLinha);
}

export async function salvarProduto(e: ProdutoEntrada): Promise<{ ok: true; produto: Produto } | Falha> {
  const user = await requireUser();
  const db = await createClient();
  if (!limpar(e.nome, 90)) return { ok: false, erro: "Dê um nome ao produto." };
  if (e.foto && e.foto.length > MAX_FOTO_BYTES) return { ok: false, erro: "Foto grande demais. Use uma imagem menor." };

  let atual: Produto | undefined;
  if (e.id) {
    const { data } = await db.from("lists").select("id, filter").eq("id", e.id).eq("tag", PRODUTO_TAG).maybeSingle();
    if (!data) return { ok: false, erro: "Produto não encontrado." };
    atual = deLinha(data);
  } else {
    const plano = await planoDoWorkspace(db, user.workspaceId);
    const limite = LIMITES[plano].produtos;
    const { count } = await db.from("lists").select("id", { count: "exact", head: true }).eq("tag", PRODUTO_TAG);
    if (limite !== null && (count ?? 0) >= limite) {
      return { ok: false, erro: `O pacote ${NOME_PLANO[plano]} permite ${limite} produtos no catálogo. Veja os pacotes para cadastrar mais.` };
    }
  }

  const dados = normalizar(e, atual);
  const nome = `Produto — ${dados.nome}`.slice(0, 120);
  const r = atual
    ? await db.from("lists").update({ filter: dados, name: nome }).eq("id", atual.id).select("id, filter").single()
    : await db.from("lists").insert({ workspace_id: user.workspaceId, tag: PRODUTO_TAG, name: nome, filter: dados }).select("id, filter").single();
  if (r.error || !r.data) return { ok: false, erro: "Não foi possível salvar o produto." };
  return { ok: true, produto: deLinha(r.data) };
}

export async function excluirProduto(id: string): Promise<{ ok: true } | Falha> {
  await requireUser();
  const db = await createClient();
  const { error } = await db.from("lists").delete().eq("id", id).eq("tag", PRODUTO_TAG);
  return error ? { ok: false, erro: "Não foi possível excluir o produto." } : { ok: true };
}

/** Confere o limite mensal de textos com IA do pacote. */
async function podeUsarIA(): Promise<Falha | null> {
  const user = await requireUser();
  if (!iaConfigurada()) return { ok: false, erro: "A IA ainda não está ligada (falta a chave OPENAI_API_KEY). Use as sugestões da categoria." };
  const db = await createClient();
  const limite = LIMITES[await planoDoWorkspace(db, user.workspaceId)].iaMes;
  if (restante(limite, (await usoDoMes(db)).ia) === 0) return { ok: false, erro: `Você usou os ${limite} textos com IA do seu pacote este mês.` };
  return null;
}

/** Sugere com IA quem compra o produto. Só devolve CNAEs que existem na base. */
export async function sugerirCompradoresIA(p: { nome: string; descricao: string; categoria: string }): Promise<{ ok: true; compradores: Comprador[]; foraDaBase: number } | Falha> {
  const bloqueio = await podeUsarIA();
  if (bloqueio) return bloqueio;
  const r = await gerarJson<{ compradores?: Comprador[] }>({
    modelo: MODELOS.compradores,
    instrucoes: SYSTEM_COMPRADORES,
    pedido: pedidoCompradores({ nome: limpar(p.nome, 90), descricao: limpar(p.descricao, 280), categoria: limpar(p.categoria, 30) }),
    schema: SCHEMA_COMPRADORES,
    nome: "compradores",
    maxTokens: 3000,
  });
  if (!r.ok) return r;
  const facets = await getFacets().catch(() => null);
  const naBase = new Map((facets?.cnaes ?? []).map((c) => [c.code, c.description]));
  const sugeridos = (r.dados.compradores ?? []).map((c) => ({ code: String(c.code).replace(/\D/g, ""), descricao: limpar(c.descricao, 90) })).filter((c) => /^\d{7}$/.test(c.code));
  const validos = sugeridos.filter((c) => naBase.size === 0 || naBase.has(c.code)).slice(0, MAX_COMPRADORES);
  if (!validos.length) return { ok: false, erro: "A IA não achou compradores desse produto na base atual. Escolha as atividades à mão." };
  return { ok: true, compradores: validos, foraDaBase: sugeridos.length - validos.length };
}

/** Escreve com IA uma oferta do produto (modelo com {nome} e {empresa}, para disparo). */
export async function escreverOfertaIA(id: string, canal: "email" | "whatsapp"): Promise<{ ok: true; assunto: string; texto: string } | Falha> {
  const bloqueio = await podeUsarIA();
  if (bloqueio) return bloqueio;
  const user = await requireUser();
  const db = await createClient();
  const [{ data: linha }, { data: port }] = await Promise.all([
    db.from("lists").select("id, filter").eq("id", id).eq("tag", PRODUTO_TAG).maybeSingle(),
    db.from("lists").select("filter").eq("tag", PORTFOLIO_TAG).limit(1).maybeSingle(),
  ]);
  if (!linha) return { ok: false, erro: "Produto não encontrado." };
  const p = deLinha(linha);
  const pf: Portfolio = completar(port?.filter as Partial<Portfolio> | null);
  const r = await escreverAbordagem({
    canal,
    modelo: true,
    lead: { nome: "", cargo: "", empresa: "", cidade: "" },
    remetente: {
      nome: pf.identidade.nome === "Seu nome" ? user.name : pf.identidade.nome,
      empresa: pf.identidade.empresa === "Sua empresa" ? user.workspaceName : pf.identidade.empresa,
      tagline: pf.identidade.tagline,
      solucoes: [`${p.nome}${p.descricao ? ` (${p.descricao})` : ""}, ${formatarPreco(p)}${p.pedidoMinimo ? `, pedido mínimo ${p.pedidoMinimo}` : ""}`],
      cases: pf.cases.slice(0, 2).map((c) => `${c.cliente}: ${c.resultado}`),
      temLinkPortfolio: !!pf.compartilhar?.ativo,
    },
    instrucao: `Ofereça este produto a empresas do tipo ${p.compradores.slice(0, 4).map((c) => c.descricao).join(", ") || "que revendem ou usam o produto"}. Cite o preço só se ele estiver no contexto.`,
  });
  if (r.ok) {
    const alvo = (await db.from("leads").select("id").limit(1).maybeSingle()).data?.id;
    if (alvo) await db.from("lead_events").insert({ lead_id: alvo, workspace_id: user.workspaceId, type: "ai_generated", payload: { canal, modelo: true, produto: p.nome } });
  }
  return r;
}

/** Guarda a oferta como modelo de WhatsApp (aparece no botão de WhatsApp de cada lead). */
export async function salvarOfertaComoModelo(nome: string, texto: string): Promise<{ ok: true } | Falha> {
  await requireUser();
  const n = limpar(nome, 40) || "Oferta";
  const tx = limpar(texto, 1500);
  if (!tx) return { ok: false, erro: "A mensagem está vazia." };
  try {
    const c = await carregarConfig();
    const modelos = c.whatsapp.modelos.filter((m) => m.nome !== n).slice(0, 19);
    await salvarConfig({ ...c, whatsapp: { modelos: [...modelos, { id: `oferta-${Date.now().toString(36)}`, nome: n, texto: tx }] } });
    return { ok: true };
  } catch {
    return { ok: false, erro: "Não foi possível salvar o modelo." };
  }
}
