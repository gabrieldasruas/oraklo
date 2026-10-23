// Conteúdo fictício das páginas do painel e das páginas institucionais.

export type Niche = {
  id: string;
  group: string;
  icon: string;
  name: string;
  region: string;
  description: string;
  companies: number;
  contacts: number;
  score: number | null; // null até existir o score de fit (fase 3)
  roles: string[];
  samples: string[];
  tags: string[];
  preview?: boolean; // dados de exemplo: nicho ainda não importado da Receita
  atividade?: boolean; // atividade (CNAE) escolhida pelo cliente, montada a partir da base
};

export const nicheGroups = [
  "Todos",
  "Transporte e logística",
  "Indústria",
  "Agro",
  "Varejo e distribuição",
  "Saúde",
  "Serviços",
];

export const niches: Niche[] = [
  {
    id: "transportadoras-sc",
    group: "Transporte e logística",
    icon: "truck",
    name: "Transportadoras em SC",
    region: "Santa Catarina",
    description: "Empresas de transporte rodoviário de cargas com sede ou filiais em Santa Catarina.",
    companies: 1840,
    contacts: 5320,
    score: 88,
    roles: ["Diretor de operações", "Gerente de frota", "Sócio-proprietário"],
    samples: ["Rota Sul Cargas", "TransCatarina", "Litoral Express"],
    tags: ["Rodoviário", "Cargas fracionadas", "Frota própria"],
  },
  {
    id: "armazens-logisticos",
    group: "Transporte e logística",
    icon: "warehouse",
    name: "Armazéns logísticos",
    region: "Sul e Sudeste",
    description: "Centros de armazenagem, cross-docking e fulfillment com operação terceirizada.",
    companies: 960,
    contacts: 2710,
    score: 84,
    roles: ["Gerente de armazém", "Coordenador logístico", "Diretor comercial"],
    samples: ["Depósito Central", "LogiHub", "Armazéns do Vale"],
    tags: ["Armazenagem", "Cross-docking", "Fulfillment"],
  },
  {
    id: "operacoes-transportes",
    group: "Transporte e logística",
    icon: "route",
    name: "Operações de transportes",
    region: "Brasil",
    description: "Operadores e gestores de rotas, despacho e entregas de última milha.",
    companies: 1320,
    contacts: 3980,
    score: 79,
    roles: ["Gerente de transportes", "Analista de roteirização", "Head de operações"],
    samples: ["Entrega Já", "Via Rápida Logística", "MultiRotas"],
    tags: ["Última milha", "Roteirização", "TMS"],
  },
  {
    id: "cargas-refrigeradas",
    group: "Transporte e logística",
    icon: "snowflake",
    name: "Cargas refrigeradas",
    region: "Sul",
    description: "Transportadoras e operadores de cadeia fria para alimentos e farmacêuticos.",
    companies: 410,
    contacts: 1130,
    score: 81,
    roles: ["Diretor logístico", "Gerente de qualidade"],
    samples: ["FrioSul", "ColdLine", "Termo Cargas"],
    tags: ["Cadeia fria", "Alimentos", "Farma"],
  },
  {
    id: "operadores-3pl",
    group: "Transporte e logística",
    icon: "package",
    name: "Operadores logísticos 3PL",
    region: "Brasil",
    description: "Empresas que terceirizam toda a logística para indústria e varejo.",
    companies: 620,
    contacts: 1890,
    score: 90,
    roles: ["CEO", "Diretor comercial", "Gerente de contas"],
    samples: ["Pronto3PL", "LogOne", "Integra Supply"],
    tags: ["3PL", "Contratos de longo prazo"],
  },
  {
    id: "metalmecanicas",
    group: "Indústria",
    icon: "factory",
    name: "Metalmecânicas no Sul",
    region: "Sul",
    description: "Indústrias de usinagem, estamparia e fabricação de componentes metálicos.",
    companies: 2250,
    contacts: 6400,
    score: 76,
    roles: ["Diretor industrial", "Gerente de compras", "Gerente de PCP"],
    samples: ["Usinar Metais", "Forja Sul", "Estampa Brasil"],
    tags: ["Usinagem", "B2B", "Compras recorrentes"],
  },
  {
    id: "textil-sc",
    group: "Indústria",
    icon: "factory",
    name: "Indústria têxtil em SC",
    region: "Vale do Itajaí",
    description: "Fábricas de tecidos, malharias e confecções do polo têxtil catarinense.",
    companies: 1480,
    contacts: 3650,
    score: 72,
    roles: ["Diretor", "Gerente de produção", "Comprador"],
    samples: ["Malhas do Vale", "Têxtil Itajaí", "Fio & Trama"],
    tags: ["Têxtil", "Exportação"],
  },
  {
    id: "embalagens",
    group: "Indústria",
    icon: "package",
    name: "Fábricas de embalagens",
    region: "Sul e Sudeste",
    description: "Produtores de caixas, plásticos e embalagens industriais.",
    companies: 540,
    contacts: 1420,
    score: 74,
    roles: ["Gerente comercial", "Diretor de operações"],
    samples: ["EmbalaMais", "Caixa Forte", "PlastiPack"],
    tags: ["Embalagens", "Industrial"],
  },
  {
    id: "cooperativas-agricolas",
    group: "Agro",
    icon: "wheat",
    name: "Cooperativas agrícolas",
    region: "Sul e Centro-Oeste",
    description: "Cooperativas de grãos, leite e proteína animal com grande rede de associados.",
    companies: 380,
    contacts: 990,
    score: 83,
    roles: ["Superintendente", "Gerente de TI", "Gerente comercial"],
    samples: ["Coop Campo Verde", "Agrária Sul", "Coop Planalto"],
    tags: ["Grãos", "Associados", "Grande porte"],
  },
  {
    id: "revendas-insumos",
    group: "Agro",
    icon: "wheat",
    name: "Revendas de insumos",
    region: "Brasil",
    description: "Lojas e distribuidores de sementes, fertilizantes e defensivos.",
    companies: 2100,
    contacts: 4870,
    score: 69,
    roles: ["Sócio", "Gerente de vendas"],
    samples: ["Agro Safra", "Terra Fértil", "Campo Forte Insumos"],
    tags: ["Insumos", "Varejo agro"],
  },
  {
    id: "atacadistas",
    group: "Varejo e distribuição",
    icon: "store",
    name: "Distribuidoras atacadistas",
    region: "Brasil",
    description: "Atacadistas e distribuidores com carteira ativa de pequenos varejistas.",
    companies: 1760,
    contacts: 4310,
    score: 80,
    roles: ["Diretor comercial", "Gerente de logística"],
    samples: ["Atacado Central", "DistribuiMais", "Rede Abastece"],
    tags: ["Atacado", "Distribuição"],
  },
  {
    id: "ecommerce",
    group: "Varejo e distribuição",
    icon: "cart",
    name: "E-commerces de médio porte",
    region: "Brasil",
    description: "Lojas virtuais com operação própria de estoque e expedição.",
    companies: 1290,
    contacts: 2980,
    score: 77,
    roles: ["Head de e-commerce", "Gerente de operações"],
    samples: ["LojaNova", "Casa & Cia Online", "Mercado Azul"],
    tags: ["E-commerce", "Expedição"],
  },
  {
    id: "clinicas",
    group: "Saúde",
    icon: "health",
    name: "Clínicas e laboratórios",
    region: "Capitais",
    description: "Clínicas, laboratórios e centros de diagnóstico de médio porte.",
    companies: 1530,
    contacts: 3340,
    score: 71,
    roles: ["Diretor administrativo", "Gestor de TI"],
    samples: ["Clínica Vida", "LabCenter", "Diagnóstica Sul"],
    tags: ["Saúde", "Gestão"],
  },
  {
    id: "construtoras",
    group: "Serviços",
    icon: "hardhat",
    name: "Construtoras regionais",
    region: "Sul",
    description: "Construtoras e incorporadoras com obras ativas e compras recorrentes.",
    companies: 870,
    contacts: 2140,
    score: 73,
    roles: ["Diretor de obras", "Gerente de suprimentos"],
    samples: ["Alicerce Construções", "Torre Sul", "Obra Prima"],
    tags: ["Construção", "Suprimentos"],
  },
  {
    id: "contabilidade",
    group: "Serviços",
    icon: "calc",
    name: "Escritórios de contabilidade",
    region: "Brasil",
    description: "Escritórios contábeis que atendem PMEs e podem indicar soluções aos clientes.",
    companies: 3200,
    contacts: 6100,
    score: 66,
    roles: ["Sócio", "Contador responsável"],
    samples: ["Contábil Prime", "Número Certo", "Fiscal Sul"],
    tags: ["Contabilidade", "Parceiros"],
  },
];

export const overview = {
  kpis: [
    { label: "Novos leads (30 dias)", value: "684", delta: "+14%" },
    { label: "Taxa de resposta", value: "17,3%", delta: "+2,1 pp" },
    { label: "Reuniões agendadas", value: "37", delta: "+5" },
    { label: "Receita influenciada", value: "R$ 182 mil", delta: "+9%" },
  ],
  funnel: [
    { label: "Leads", value: 2480, pct: 100 },
    { label: "Contatados", value: 1136, pct: 46 },
    { label: "Responderam", value: 214, pct: 9 },
    { label: "Reuniões", value: 37, pct: 1.5 },
  ],
  activity: [
    { who: "Juliana Rocha", what: "marcou reunião", when: "há 2 h" },
    { who: "Carla Mendes", what: "respondeu à sequência “Outbound logística”", when: "há 5 h" },
    { who: "Lista “Transportadoras SC”", what: "recebeu 120 novos contatos", when: "ontem" },
    { who: "Bruno Alves", what: "entrou na sequência “Boas-vindas”", when: "ontem" },
  ],
};

export const lists = [
  { name: "Transportadoras SC — diretores", count: 420, updated: "hoje", owner: "Você", tag: "Logística" },
  { name: "Armazéns logísticos — Sul", count: 310, updated: "ontem", owner: "Rafael Lima", tag: "Logística" },
  { name: "Metalmecânicas — compras", count: 580, updated: "há 3 dias", owner: "Ana Souza", tag: "Indústria" },
  { name: "Cooperativas agrícolas", count: 190, updated: "há 5 dias", owner: "Você", tag: "Agro" },
  { name: "Atacadistas — Sudeste", count: 740, updated: "há 1 semana", owner: "Mariana Costa", tag: "Varejo" },
  { name: "Clínicas — capitais", count: 260, updated: "há 2 semanas", owner: "Rafael Lima", tag: "Saúde" },
];

export const sequences = [
  { name: "Outbound logística", steps: 6, enrolled: 420, reply: 18.4, status: "Ativa" },
  { name: "Boas-vindas a novos leads", steps: 3, enrolled: 215, reply: 22.1, status: "Ativa" },
  { name: "Reativação de contatos frios", steps: 4, enrolled: 530, reply: 6.8, status: "Pausada" },
  { name: "Indústria — compras", steps: 5, enrolled: 310, reply: 14.2, status: "Ativa" },
  { name: "Convite para demonstração", steps: 2, enrolled: 98, reply: 31.5, status: "Rascunho" },
];

export const reports = {
  kpis: [
    { label: "E-mails enviados", value: "9.420" },
    { label: "Taxa de abertura", value: "52%" },
    { label: "Taxa de resposta", value: "17,3%" },
    { label: "Conversão em reunião", value: "3,3%" },
  ],
  weekly: [
    { week: "S1", value: 6 },
    { week: "S2", value: 9 },
    { week: "S3", value: 7 },
    { week: "S4", value: 11 },
    { week: "S5", value: 8 },
    { week: "S6", value: 13 },
    { week: "S7", value: 10 },
    { week: "S8", value: 15 },
  ],
  bySegment: [
    { name: "Transportadoras em SC", leads: 420, reply: 19.8, meetings: 14 },
    { name: "Armazéns logísticos", leads: 310, reply: 16.2, meetings: 9 },
    { name: "Metalmecânicas no Sul", leads: 580, reply: 12.9, meetings: 8 },
    { name: "Cooperativas agrícolas", leads: 190, reply: 15.1, meetings: 6 },
  ],
};

export const productSteps = [
  { n: "01", title: "Defina seu cliente ideal", text: "Escolha os nichos e o perfil (porte, capital, tipo de contato) na Segmentação." },
  { n: "02", title: "Encontre no mapa", text: "Busque por raio, cidade ou estado e veja as empresas com pin no endereço e score." },
  { n: "03", title: "Aborde", text: "Mande ao pipeline, dispare e-mail com follow-up ou chame no WhatsApp." },
  { n: "04", title: "Meça e ajuste", text: "Os relatórios mostram o que responde mais por segmento, cidade, porte e score." },
];

export const faq = [
  { q: "O Free tem prazo?", a: "Não. Use à vontade dentro dos limites do pacote (30 buscas, 50 empresas e 20 e-mails por mês), sem cartão de crédito." },
  { q: "De onde vêm os dados das empresas?", a: "Do cadastro público de CNPJ da Receita Federal. Hoje a base cobre Santa Catarina; outros estados estão a caminho." },
  { q: "Como fica a LGPD?", a: "Usamos dados públicos de empresas para contato comercial, e todo e-mail enviado pelo Oraklo tem link para a pessoa sair da lista. Veja a política de privacidade." },
  { q: "Qual a diferença entre Premium e Ultra?", a: "O Premium tem 300 buscas por mês na Busca avançada, follow-up automático, decisores e integração com CRM. O Ultra libera a busca sem limite, empresas ilimitadas no pipeline e tira a marca Oraklo do portfólio." },
  { q: "Como pago?", a: "O pagamento por Pix e cartão está chegando. Até lá, fale com a gente e ativamos seu pacote na hora." },
];
