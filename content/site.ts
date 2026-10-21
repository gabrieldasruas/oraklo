// Todo o conteúdo (fictício) do layout fica aqui. Nesta fase não há funcionalidades.
export const site = {
  name: "Oraklo",
  title: "Oraklo — Saiba quem vai comprar antes da primeira ligação",
  description:
    "Plataforma de prospecção B2B: base de contatos, filtros avançados e sequências de abordagem em um só lugar.",
  email: "contato@oraklo.app",
  nav: [
    { label: "Produto", href: "/produto" },
    { label: "Segmentação", href: "/segmentacao" },
    { label: "Histórias", href: "/historias" },
    { label: "Preços", href: "/precos" },
    { label: "Painel", href: "/painel" },
  ],
  hero: {
    eyebrow: "Prospecção B2B",
    title: "Encontre os clientes certos e converse com eles primeiro.",
    subtitle:
      "Uma base de contatos filtrável, dados sempre atualizados e sequências de abordagem para o seu time comercial vender mais, com menos trabalho manual.",
    primary: { label: "Começar grátis", href: "/painel" },
    secondary: { label: "Ver histórias de clientes", href: "/historias" },
    note: "Sem cartão de crédito · 14 dias de teste",
  },
  logos: ["Vertix", "Nuvemar", "Orbita", "Cálamo", "Tessera", "Lumen"],
  stats: [
    { value: 120, suffix: "M+", label: "contatos verificados" },
    { value: 3, suffix: "x", label: "mais reuniões agendadas" },
    { value: 95, suffix: "%", label: "de cobertura de e-mail" },
    { value: 5, suffix: " min", label: "para a primeira lista" },
  ],
  features: [
    { icon: "search", title: "Busca avançada", text: "Filtre por cargo, setor, porte, tecnologia e localização em segundos." },
    { icon: "database", title: "Base de contatos", text: "Milhões de decisores com e-mail e telefone verificados." },
    { icon: "sparkles", title: "Enriquecimento", text: "Complete automaticamente dados que faltam nas suas listas." },
    { icon: "mail", title: "Sequências", text: "Cadências de e-mail e ligação com acompanhamento de respostas." },
    { icon: "target", title: "Pontuação de leads", text: "Priorize quem tem mais chance de fechar com um score claro." },
    { icon: "plug", title: "Integrações", text: "Sincronize com o seu CRM e as ferramentas que o time já usa." },
  ],
  categories: ["Todas", "Histórias de clientes", "Automação e IA", "Outbound", "Dados e enriquecimento", "Pequenas equipes"],
  stories: [
    { category: "Histórias de clientes", title: "Como a Vertix chegou a 99% de cobertura de e-mail nas listas", metric: "99%", company: "Vertix", read: "5 min" },
    { category: "Automação e IA", title: "Nuvemar automatizou a abordagem e dobrou a taxa de resposta", metric: "2x", company: "Nuvemar", read: "4 min" },
    { category: "Outbound", title: "Orbita multiplicou por 5 o crescimento de pipeline em um ano", metric: "5x", company: "Orbita", read: "6 min" },
    { category: "Dados e enriquecimento", title: "Cálamo limpou a base e reduziu bounces em 70%", metric: "-70%", company: "Cálamo", read: "4 min" },
    { category: "Pequenas equipes", title: "Com 3 vendedores, a Tessera passou a agendar 40 reuniões por mês", metric: "40", company: "Tessera", read: "3 min" },
    { category: "Histórias de clientes", title: "Lumen aumentou a receita em mais de 200% com prospecção ativa", metric: "200%+", company: "Lumen", read: "7 min" },
    { category: "Outbound", title: "Playbook de outbound: do primeiro e-mail à reunião marcada", metric: "Guia", company: "Prospecta", read: "8 min" },
    { category: "Automação e IA", title: "Como priorizar leads com pontuação e ganhar tempo do time", metric: "Guia", company: "Prospecta", read: "5 min" },
    { category: "Dados e enriquecimento", title: "Checklist de qualidade de dados para times comerciais", metric: "Guia", company: "Prospecta", read: "3 min" },
  ],
  wall: {
    title: "O Mural de Elogios",
    text: "Veja o que times comerciais de todos os tamanhos dizem sobre usar a Prospecta no dia a dia.",
    cta: { label: "Ler depoimentos", href: "/historias" },
    quotes: [
      { name: "Mariana Costa", role: "Head de Vendas, Vertix", text: "Em uma semana a gente já tinha listas melhores do que em meses de pesquisa manual." },
      { name: "Rafael Lima", role: "SDR, Nuvemar", text: "As sequências economizam horas por dia e eu sei exatamente quem priorizar." },
      { name: "Ana Souza", role: "Fundadora, Tessera", text: "Pela primeira vez a prospecção virou um processo previsível para a gente." },
    ],
  },
  cta: {
    title: "Pronto para encher o seu funil?",
    text: "Crie sua conta e monte a primeira lista de prospecção em minutos.",
    primary: { label: "Começar grátis", href: "/painel" },
    secondary: { label: "Falar com vendas", href: "/#contato" },
  },
  footer: {
    columns: [
      { title: "Produto", links: ["Busca de leads", "Enriquecimento", "Sequências", "Integrações"] },
      { title: "Soluções", links: ["Para SDRs", "Para gestores", "Para startups", "Para agências"] },
      { title: "Recursos", links: ["Histórias de clientes", "Blog", "Guias", "Central de ajuda"] },
      { title: "Empresa", links: ["Sobre", "Carreiras", "Contato", "Privacidade"] },
    ],
  },
};
