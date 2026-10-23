// Catálogo de produtos e "Quem compra o que eu vendo". Compartilhado entre servidor e cliente.
// Cada produto fica numa linha de `lists` (tag interna), como o portfólio: RLS por workspace, sem tabela nova.

export const PRODUTO_TAG = "__produto__";

/** Tipo de empresa que compra o produto (CNAE da atividade principal). */
export type Comprador = { code: string; descricao: string };

export type Produto = {
  id: string;
  nome: string;
  descricao: string;
  categoria: string; // id de CATEGORIAS ("outro" quando não se encaixa)
  preco: number | null;
  unidade: string; // "un", "cx com 12", "kg"...
  pedidoMinimo: string;
  mostrarPreco: boolean; // false = "sob consulta" no catálogo e nas ofertas
  foto: string | null; // data URL reduzida no navegador
  compradores: Comprador[];
  compradoresFonte: "tabela" | "ia" | "manual";
  criadoEm: string;
  atualizadoEm: string;
};

export type ProdutoEntrada = Omit<Produto, "id" | "criadoEm" | "atualizadoEm"> & { id?: string };

export const MAX_FOTO_BYTES = 350_000;
export const MAX_COMPRADORES = 12;

/** Categorias de produto e quem costuma comprar cada uma (CNAEs de revenda, uso ou transformação). */
export const CATEGORIAS: { id: string; nome: string; palavras: string[]; compradores: Comprador[] }[] = [
  {
    id: "bebidas",
    nome: "Bebidas",
    palavras: ["bebida", "cerveja", "chope", "refrigerante", "agua mineral", "suco", "energetico", "destilado", "cachaca", "vodka", "whisky", "gin"],
    compradores: [
      { code: "5611204", descricao: "Bares sem entretenimento" },
      { code: "5611205", descricao: "Bares com entretenimento" },
      { code: "5611201", descricao: "Restaurantes" },
      { code: "4723700", descricao: "Lojas de bebidas" },
      { code: "4712100", descricao: "Mercearias e minimercados" },
      { code: "4711302", descricao: "Supermercados" },
      { code: "5620102", descricao: "Bufês e eventos" },
      { code: "5510801", descricao: "Hotéis" },
    ],
  },
  {
    id: "vinhos",
    nome: "Vinhos e importados",
    palavras: ["vinho", "espumante", "champanhe", "azeite", "importado", "queijo", "empório", "emporio"],
    compradores: [
      { code: "5611201", descricao: "Restaurantes" },
      { code: "4723700", descricao: "Lojas de bebidas e adegas" },
      { code: "4729699", descricao: "Empórios e lojas de alimentos" },
      { code: "5611204", descricao: "Bares sem entretenimento" },
      { code: "5510801", descricao: "Hotéis" },
      { code: "5620102", descricao: "Bufês e eventos" },
      { code: "4711302", descricao: "Supermercados" },
    ],
  },
  {
    id: "alimentos",
    nome: "Alimentos e food service",
    palavras: ["alimento", "farinha", "carne", "frango", "congelado", "molho", "tempero", "cafe", "acucar", "oleo", "laticinio", "doce", "chocolate", "salgado"],
    compradores: [
      { code: "5611201", descricao: "Restaurantes" },
      { code: "5611203", descricao: "Lanchonetes" },
      { code: "4721102", descricao: "Padarias" },
      { code: "1091102", descricao: "Padarias e confeitarias com produção própria" },
      { code: "5620101", descricao: "Refeições para empresas" },
      { code: "4712100", descricao: "Mercearias e minimercados" },
      { code: "4711302", descricao: "Supermercados" },
    ],
  },
  {
    id: "tecidos",
    nome: "Tecidos e aviamentos",
    palavras: ["tecido", "malha", "linha", "aviamento", "botao", "ziper", "elastico", "renda", "jeans", "brim", "viscose"],
    compradores: [
      { code: "1412601", descricao: "Confecções de roupas" },
      { code: "1412602", descricao: "Confecção sob medida" },
      { code: "1411801", descricao: "Confecção de roupas íntimas" },
      { code: "1413401", descricao: "Confecção de roupas profissionais" },
      { code: "4755501", descricao: "Lojas de tecidos" },
      { code: "4755502", descricao: "Armarinhos" },
      { code: "1359600", descricao: "Fábricas de produtos têxteis" },
    ],
  },
  {
    id: "pneus",
    nome: "Pneus e autopeças",
    palavras: ["pneu", "camara de ar", "autopeca", "peca", "oleo motor", "lubrificante", "bateria", "filtro", "freio", "amortecedor"],
    compradores: [
      { code: "4520006", descricao: "Borracharias" },
      { code: "4520001", descricao: "Oficinas mecânicas" },
      { code: "4530705", descricao: "Lojas de pneus" },
      { code: "4530703", descricao: "Lojas de autopeças" },
      { code: "4520007", descricao: "Instalação de acessórios automotivos" },
      { code: "4930202", descricao: "Transportadoras (frota própria)" },
    ],
  },
  {
    id: "construcao",
    nome: "Material de construção",
    palavras: ["cimento", "tijolo", "areia", "argamassa", "tinta", "piso", "revestimento", "ferragem", "ferramenta", "tubo", "cano", "fio", "cabo eletrico", "telha"],
    compradores: [
      { code: "4744099", descricao: "Lojas de materiais de construção" },
      { code: "4744001", descricao: "Ferragens e ferramentas" },
      { code: "4120400", descricao: "Construtoras" },
      { code: "4330499", descricao: "Obras de acabamento" },
      { code: "4321500", descricao: "Instaladores elétricos" },
      { code: "4322301", descricao: "Instaladores hidráulicos" },
    ],
  },
  {
    id: "limpeza",
    nome: "Limpeza e higiene",
    palavras: ["limpeza", "detergente", "desinfetante", "sabao", "papel toalha", "papel higienico", "alcool", "saco de lixo", "higiene"],
    compradores: [
      { code: "8121400", descricao: "Empresas de limpeza" },
      { code: "8112500", descricao: "Condomínios" },
      { code: "5510801", descricao: "Hotéis" },
      { code: "5611201", descricao: "Restaurantes" },
      { code: "8630504", descricao: "Clínicas odontológicas" },
      { code: "8630503", descricao: "Clínicas médicas" },
      { code: "4711302", descricao: "Supermercados" },
    ],
  },
  {
    id: "embalagens",
    nome: "Embalagens e descartáveis",
    palavras: ["embalagem", "caixa", "sacola", "descartavel", "copo", "marmita", "pote", "etiqueta", "filme"],
    compradores: [
      { code: "5611201", descricao: "Restaurantes" },
      { code: "5611203", descricao: "Lanchonetes" },
      { code: "4721102", descricao: "Padarias" },
      { code: "1091102", descricao: "Confeitarias com produção própria" },
      { code: "1099699", descricao: "Fábricas de alimentos" },
      { code: "4713004", descricao: "Lojas de departamento e variedades" },
    ],
  },
  {
    id: "beleza",
    nome: "Beleza e cosméticos",
    palavras: ["cosmetico", "shampoo", "perfume", "maquiagem", "creme", "esmalte", "cabelo", "estetica", "beleza"],
    compradores: [
      { code: "9602501", descricao: "Salões de beleza" },
      { code: "9602502", descricao: "Clínicas de estética" },
      { code: "4772500", descricao: "Lojas de cosméticos" },
      { code: "4771701", descricao: "Farmácias" },
    ],
  },
  {
    id: "uniformes",
    nome: "Uniformes e EPI",
    palavras: ["uniforme", "epi", "bota", "luva", "capacete", "jaleco", "colete", "protecao"],
    compradores: [
      { code: "4120400", descricao: "Construtoras" },
      { code: "2511000", descricao: "Metalúrgicas" },
      { code: "4930202", descricao: "Transportadoras" },
      { code: "8121400", descricao: "Empresas de limpeza" },
      { code: "5611201", descricao: "Restaurantes" },
      { code: "8630503", descricao: "Clínicas médicas" },
    ],
  },
  {
    id: "escritorio",
    nome: "Escritório e informática",
    palavras: ["papel", "toner", "cartucho", "computador", "notebook", "impressora", "monitor", "cadeira", "mesa", "papelaria", "software"],
    compradores: [
      { code: "6920601", descricao: "Escritórios de contabilidade" },
      { code: "6911701", descricao: "Escritórios de advocacia" },
      { code: "8630503", descricao: "Clínicas médicas" },
      { code: "8513900", descricao: "Escolas" },
      { code: "4761003", descricao: "Papelarias" },
      { code: "4751201", descricao: "Lojas de informática" },
    ],
  },
  {
    id: "moveis",
    nome: "Móveis e decoração",
    palavras: ["movel", "moveis", "sofa", "poltrona", "decoracao", "luminaria", "cortina", "tapete"],
    compradores: [
      { code: "4754701", descricao: "Lojas de móveis" },
      { code: "5510801", descricao: "Hotéis" },
      { code: "5611201", descricao: "Restaurantes" },
      { code: "4120400", descricao: "Construtoras" },
      { code: "8630504", descricao: "Clínicas odontológicas" },
    ],
  },
  {
    id: "agro",
    nome: "Insumos agro",
    palavras: ["semente", "adubo", "fertilizante", "racao", "defensivo", "agro", "pecuaria", "irrigacao"],
    compradores: [
      { code: "0111302", descricao: "Produtores de milho" },
      { code: "0115600", descricao: "Produtores de soja" },
      { code: "0151201", descricao: "Criadores de gado de corte" },
      { code: "0155501", descricao: "Criadores de frango" },
      { code: "4683400", descricao: "Revendas de insumos agrícolas" },
    ],
  },
  {
    id: "pet",
    nome: "Pet",
    palavras: ["pet", "cachorro", "gato", "racao pet", "petisco", "coleira", "areia sanitaria"],
    compradores: [
      { code: "4789004", descricao: "Pet shops" },
      { code: "7500100", descricao: "Clínicas veterinárias" },
      { code: "9609208", descricao: "Banho e tosa" },
    ],
  },
  { id: "outro", nome: "Outro", palavras: [], compradores: [] },
];

export const categoriaPorId = (id: string) => CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];

const semAcento = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Adivinha a categoria pelo nome/descrição do produto ("Pneu 295/80 R22" → pneus). */
export function adivinharCategoria(texto: string): string {
  const t = ` ${semAcento(texto)} `;
  let melhor = { id: "outro", pontos: 0 };
  for (const c of CATEGORIAS) {
    const pontos = c.palavras.reduce((s, p) => s + (t.includes(semAcento(p)) ? p.length : 0), 0);
    if (pontos > melhor.pontos) melhor = { id: c.id, pontos };
  }
  return melhor.id;
}

/** Compradores sugeridos pela tabela da categoria. */
export const compradoresDaCategoria = (id: string): Comprador[] => categoriaPorId(id).compradores.map((c) => ({ ...c }));

/** Junta os compradores de vários produtos sem repetir (para "encontrar compradores de tudo"). */
export function unirCompradores(produtos: Pick<Produto, "compradores">[]): Comprador[] {
  const vistos = new Map<string, Comprador>();
  for (const p of produtos) for (const c of p.compradores) if (!vistos.has(c.code)) vistos.set(c.code, c);
  return [...vistos.values()];
}

export const formatarPreco = (p: Pick<Produto, "preco" | "unidade" | "mostrarPreco">) =>
  !p.mostrarPreco || p.preco === null
    ? "Sob consulta"
    : `${p.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}${p.unidade ? ` / ${p.unidade}` : ""}`;

/** Link da Busca avançada já filtrada pelos compradores do produto. */
export const linkBusca = (nome: string, compradores: Comprador[]) =>
  `/busca-avancada?produto=${encodeURIComponent(nome.slice(0, 80))}&cnaes=${compradores.map((c) => c.code).join(",")}`;

/** Oferta pronta (sem IA) com as variáveis do disparo: {nome}, {empresa}, {link_portfolio}. */
export function ofertaModelo(p: Produto, canal: "whatsapp" | "email", remetente: { nome: string; empresa: string }, temLink: boolean): { assunto: string; texto: string } {
  const preco = formatarPreco(p);
  const desc = p.descricao.trim().replace(/[.;!]+$/, "");
  const precoFrase = preco === "Sob consulta" ? "condição especial para a sua região" : `a partir de ${preco}`;
  const minimo = p.pedidoMinimo ? ` Pedido mínimo: ${p.pedidoMinimo}.` : "";
  const link = temLink ? `\n\nVeja o catálogo completo: {link_portfolio}` : "";
  if (canal === "whatsapp") {
    return {
      assunto: "",
      texto: `Oi, {nome}! Aqui é ${remetente.nome}, da ${remetente.empresa}. Trabalhamos com ${p.nome}${desc ? ` (${desc.slice(0, 90)})` : ""}, ${precoFrase}.${minimo} Faz sentido para a {empresa}? Posso te mandar os detalhes.${link}`,
    };
  }
  return {
    assunto: `${p.nome} para a {empresa}`.slice(0, 80),
    texto: `Olá, {nome}, tudo bem?\n\nSou ${remetente.nome}, da ${remetente.empresa}. Fornecemos ${p.nome}${desc ? ` — ${desc.slice(0, 160)}` : ""}, ${precoFrase}.${minimo}\n\nAcredito que pode ajudar a {empresa}. Posso te enviar uma proposta ou tirar dúvidas em uma conversa rápida?${link}\n\n${remetente.nome}\n${remetente.empresa}`,
  };
}

/** Produtos de exemplo para começar (marcados como exemplo na tela). */
export const EXEMPLOS: Pick<Produto, "nome" | "descricao" | "categoria" | "preco" | "unidade" | "pedidoMinimo">[] = [
  { nome: "Pneu de carga 295/80 R22.5", descricao: "Radial para caminhões e ônibus, com garantia de fábrica.", categoria: "pneus", preco: 1890, unidade: "un", pedidoMinimo: "4 unidades" },
  { nome: "Vinho tinto chileno Reserva", descricao: "Cabernet Sauvignon 750 ml, ideal para carta de restaurante.", categoria: "vinhos", preco: 49.9, unidade: "garrafa", pedidoMinimo: "1 caixa (6 un)" },
  { nome: "Malha de algodão penteado", descricao: "Malha 30.1 em 20 cores, rolo de 25 kg.", categoria: "tecidos", preco: 42, unidade: "kg", pedidoMinimo: "1 rolo" },
];
