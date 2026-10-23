// Pacotes do Oraklo: preços, limites e comparação. Fonte única para a aba Pacotes, a página
// pública de Preços e os limites aplicados no servidor (lib/planos.ts). Compartilhado com o cliente.

export type Plano = "gratis" | "premium" | "ultra";

export type Limites = {
  /** buscas na Busca avançada por mês */
  buscasMes: number | null;
  pipelineMes: number | null;
  emailsMes: number | null;
  iaMes: number | null;
  /** produtos no catálogo (Quem compra o que eu vendo) */
  produtos: number | null;
  /** empresas visíveis no radar */
  radarItens: number | null;
  followup: boolean;
  decisores: boolean;
  integracoes: boolean;
  relatoriosCompletos: boolean;
  semMarca: boolean;
};

export const LIMITES: Record<Plano, Limites> = {
  gratis: { produtos: 5, buscasMes: 30, pipelineMes: 50, emailsMes: 20, iaMes: 10, radarItens: 5, followup: false, decisores: false, integracoes: false, relatoriosCompletos: false, semMarca: false },
  premium: { produtos: 20, buscasMes: 300, pipelineMes: 1000, emailsMes: 1000, iaMes: 200, radarItens: null, followup: true, decisores: true, integracoes: true, relatoriosCompletos: true, semMarca: false },
  ultra: { produtos: null, buscasMes: null, pipelineMes: null, emailsMes: 5000, iaMes: 1000, radarItens: null, followup: true, decisores: true, integracoes: true, relatoriosCompletos: true, semMarca: true },
};

export const NOME_PLANO: Record<Plano, string> = { gratis: "Free", premium: "Premium", ultra: "Ultra" };

export type Pacote = {
  id: "free" | "premium" | "premium3" | "ultra";
  plano: Plano;
  nome: string;
  preco: string;
  periodo: string;
  nota?: string;
  descricao: string;
  tom: "lilac" | "lime" | "mint" | "night";
  destaque?: string;
  itens: string[];
  cta: string;
};

export const PACOTES: Pacote[] = [
  {
    id: "free",
    plano: "gratis",
    nome: "Free",
    preco: "R$ 0",
    periodo: "para sempre",
    descricao: "Para conhecer o Oraklo e fazer as primeiras abordagens.",
    tom: "lilac",
    itens: ["30 buscas por mês na Busca avançada", "50 empresas por mês no pipeline", "CRM com pipeline, calendário e tarefas", "20 e-mails e 10 textos com IA por mês", "Consulta de CNPJ e score de 0 a 100"],
    cta: "Começar grátis",
  },
  {
    id: "premium",
    plano: "premium",
    nome: "Premium",
    preco: "R$ 109,99",
    periodo: "/mês",
    descricao: "Para quem prospecta todo dia e quer automatizar a abordagem.",
    tom: "lime",
    destaque: "Mais escolhido",
    itens: ["Tudo do Free", "300 buscas por mês na Busca avançada", "1.000 empresas e 1.000 e-mails por mês", "Follow-up automático e 200 textos com IA", "Decisores, radar completo e relatórios completos", "Integração com CRM (RD Station, webhook, planilhas)"],
    cta: "Assinar Premium",
  },
  {
    id: "premium3",
    plano: "premium",
    nome: "Premium 3 meses",
    preco: "R$ 299,99",
    periodo: "a cada 3 meses",
    nota: "≈ R$ 100/mês · economize 9%",
    descricao: "O mesmo Premium, pagando por trimestre e com desconto.",
    tom: "mint",
    itens: ["Tudo do Premium", "Preço travado por 3 meses", "Uma cobrança só, sem surpresas", "Ideal para fechar um ciclo de prospecção"],
    cta: "Assinar 3 meses",
  },
  {
    id: "ultra",
    plano: "ultra",
    nome: "Ultra",
    preco: "R$ 599",
    periodo: "/mês",
    descricao: "Busca sem limite para times e operações de volume.",
    tom: "night",
    destaque: "Sem limites",
    itens: ["Tudo do Premium", "Busca avançada sem limite de uso", "Empresas ilimitadas no pipeline", "5.000 e-mails e 1.000 textos com IA por mês", "Portfólio sem a marca Oraklo", "Suporte prioritário pelo WhatsApp"],
    cta: "Assinar Ultra",
  },
];

/** Linhas da tabela de comparação. `true`/`false` viram ✓ / –. */
export type Celula = string | boolean;
export const COMPARACAO: { grupo: string; linhas: { recurso: string; gratis: Celula; premium: Celula; ultra: Celula }[] }[] = [
  {
    grupo: "Encontrar empresas",
    linhas: [
      { recurso: "Busca avançada no mapa", gratis: "30 buscas/mês", premium: "300 buscas/mês", ultra: "Sem limite" },
      { recurso: "Consulta de CNPJ e score 0–100", gratis: true, premium: true, ultra: true },
      { recurso: "Perfil de cliente ideal e 👍/👎", gratis: true, premium: true, ultra: true },
      { recurso: "Catálogo + Quem compra o que eu vendo", gratis: "5 produtos", premium: "20 produtos", ultra: "Sem limite" },
      { recurso: "Radar de novas empresas", gratis: "5 por vez", premium: "Completo", ultra: "Completo + e-mail semanal" },
      { recurso: "Decisores (nome, cargo e e-mail)", gratis: false, premium: true, ultra: true },
    ],
  },
  {
    grupo: "Abordar",
    linhas: [
      { recurso: "Empresas no pipeline", gratis: "50/mês", premium: "1.000/mês", ultra: "Ilimitado" },
      { recurso: "E-mails disparados", gratis: "20/mês", premium: "1.000/mês", ultra: "5.000/mês" },
      { recurso: "Follow-up automático", gratis: false, premium: true, ultra: true },
      { recurso: "Textos escritos com IA", gratis: "10/mês", premium: "200/mês", ultra: "1.000/mês" },
      { recurso: "WhatsApp com modelos", gratis: true, premium: true, ultra: true },
      { recurso: "Portfólio com link e visitas", gratis: true, premium: true, ultra: "Sem a marca Oraklo" },
    ],
  },
  {
    grupo: "Organizar e medir",
    linhas: [
      { recurso: "CRM: pipeline, calendário, tarefas", gratis: true, premium: true, ultra: true },
      { recurso: "Relatórios", gratis: "Resumo", premium: "Completos + exportação", ultra: "Completos + exportação" },
      { recurso: "Integração com CRM (RD Station, webhook)", gratis: false, premium: true, ultra: true },
      { recurso: "Exportar leads para CRMs", gratis: "Planilha simples", premium: "RD, Pipedrive, HubSpot", ultra: "RD, Pipedrive, HubSpot" },
      { recurso: "Suporte", gratis: "E-mail", premium: "E-mail prioritário", ultra: "WhatsApp prioritário" },
    ],
  },
];
