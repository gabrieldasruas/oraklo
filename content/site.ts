// Textos do site público. Só promessas que o produto cumpre hoje.
export const site = {
  name: "Oraklo",
  title: "Oraklo — Saiba quem vai comprar antes da primeira ligação",
  description:
    "Prospecção B2B com dados oficiais de empresas: busca no mapa, score automático, CRM e e-mail com follow-up em um só lugar.",
  email: "contato@oraklo.app",
  nav: [
    { label: "Produto", href: "/produto" },
    { label: "Segmentação", href: "/segmentacao" },
    { label: "Guias", href: "/historias" },
    { label: "Preços", href: "/precos" },
    { label: "Painel", href: "/painel" },
  ],
  hero: {
    eyebrow: "Prospecção B2B",
    title: "Encontre os clientes certos e converse com eles primeiro.",
    subtitle:
      "Empresas do cadastro público de CNPJ, filtradas no mapa e pontuadas por chance de compra. Do primeiro contato à reunião, sem planilha.",
    primary: { label: "Começar grátis", href: "/entrar" },
    secondary: { label: "Ver como funciona", href: "/produto" },
    note: "Plano grátis · sem cartão de crédito",
  },
  stats: [
    { value: 0, suffix: "", label: "dados do cadastro público de CNPJ (Receita Federal)" },
  ],
  features: [
    { icon: "search", title: "Busca no mapa", text: "Desenhe um raio e encontre empresas pela atividade (CNAE), porte, capital e tempo de mercado." },
    { icon: "database", title: "Dados oficiais", text: "Empresas do cadastro público de CNPJ da Receita Federal, com endereço, porte e contatos informados." },
    { icon: "target", title: "Score automático", text: "Cada empresa ganha uma nota de 0 a 100 para você saber quem abordar primeiro." },
    { icon: "mail", title: "E-mail com follow-up", text: "Mensagem personalizada para cada lead e follow-up automático para quem não responde." },
    { icon: "plug", title: "CRM e integrações", text: "Pipeline, tarefas e reuniões — e envio dos leads para o seu CRM por webhook ou planilha." },
    { icon: "sparkles", title: "Portfólio", text: "Apresentação pronta em PDF e link público que mostra quem abriu." },
  ],
  categories: ["Todos", "Primeiros passos", "Prospecção", "Abordagem", "Organização"],
  guias: [
    { category: "Primeiros passos", title: "Monte seu perfil de cliente ideal em 3 minutos", text: "Escolha os nichos, o porte e o tipo de contato que você quer. A busca já abre filtrada e ordenada para você.", passos: 3, read: "3 min", href: "/segmentacao#foco" },
    { category: "Prospecção", title: "Encontre empresas num raio da sua cidade", text: "Arraste o círculo no mapa, escolha a atividade e veja as empresas com pin no endereço e score de 0 a 100.", passos: 4, read: "4 min", href: "/busca-avancada" },
    { category: "Prospecção", title: "Ensine a busca com 👍 e 👎", text: "Marque quem é e quem não é seu cliente. Empresas parecidas com as aprovadas sobem nos próximos resultados.", passos: 2, read: "2 min", href: "/busca-avancada" },
    { category: "Abordagem", title: "Dispare e-mails com follow-up automático", text: "Uma mensagem com o nome de cada lead e, para quem não responder, um segundo e-mail sozinho depois de alguns dias.", passos: 4, read: "5 min", href: "/leads" },
    { category: "Abordagem", title: "Mande seu portfólio por link e saiba quem abriu", text: "Ligue o link público e use {link_portfolio} no e-mail: a visita aparece no histórico do lead.", passos: 3, read: "3 min", href: "/portfolio" },
    { category: "Organização", title: "Pipeline, tarefas e reuniões sem planilha", text: "Arraste os leads entre as etapas, crie lembretes e leve as reuniões para o Google Agenda.", passos: 3, read: "4 min", href: "/leads" },
  ],
  cta: {
    title: "Pronto para encher o seu funil?",
    text: "Crie sua conta e monte a primeira lista de prospecção em minutos.",
    primary: { label: "Começar grátis", href: "/painel" },
    secondary: { label: "Ver planos", href: "/precos" },
  },
  footer: {
    columns: [
      { title: "Produto", links: ["Busca no mapa", "Score de leads", "E-mail com follow-up", "Integrações"] },
      { title: "Para quem", links: ["Representantes comerciais", "Pequenas empresas B2B", "Times de vendas"] },
      { title: "Recursos", links: ["Guias", "Consulta de empresas", "Privacidade"] },
      { title: "Empresa", links: ["Contato", "Privacidade"] },
    ],
  },
};
