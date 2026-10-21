// Apoio ao "formato CRM" da página da empresa: quem decide, atalhos de LinkedIn e site provável.
// Nada aqui consulta o LinkedIn: só montamos links de busca prontos (o LinkedIn não permite
// extrair dados automaticamente). Enriquecimento automático exigiria um serviço pago (Apollo, Lusha…).

/** Qualificação do sócio (tabela da Receita) → rótulo legível. */
export const QUALIFICACAO: Record<string, string> = {
  "05": "Administrador",
  "08": "Conselheiro de administração",
  "10": "Diretor",
  "16": "Presidente",
  "17": "Procurador",
  "22": "Sócio",
  "28": "Sócio-gerente",
  "37": "Sócio PJ (exterior)",
  "38": "Sócio (residente no exterior)",
  "47": "Sócio",
  "48": "Sócio PJ",
  "49": "Sócio-administrador",
  "50": "Empresário",
  "52": "Sócio com capital",
  "53": "Sócio sem capital",
  "54": "Fundador",
  "65": "Titular",
  "66": "Titular (residente no exterior)",
  "78": "Titular PJ",
};

/** Quem tem poder de decisão / assina pela empresa. */
const DECISORES = new Set(["05", "10", "16", "28", "49", "50", "54", "65", "66"]);

export const rotuloCargo = (role: string | null) => (role ? (QUALIFICACAO[role.padStart(2, "0")] ?? "Sócio") : "Sócio");
export const ehDecisor = (role: string | null) => !!role && DECISORES.has(role.padStart(2, "0"));

/** Nome "de mercado" para buscas: tira LTDA, S.A., ME, EIRELI etc. */
export function nomeParaBusca(nome: string) {
  return nome
    .replace(/\b(ltda|s\.?\/?a|me|epp|eireli|limitada|sociedade anonima|cia|companhia)\b\.?/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/[\s.,&-]+$/g, "")
    .trim();
}

export const linkedinPessoas = (palavras: string) =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(palavras)}`;
export const linkedinEmpresa = (nome: string) =>
  `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(nome)}`;
export const googleBusca = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
export const googleMaps = (endereco: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;

/** Cargos que costumam decidir a compra, para atalhos de busca no LinkedIn. */
export const CARGOS_LIDERANCA = [
  "CEO",
  "Diretor",
  "Diretor Comercial",
  "Diretor de Operações",
  "Gerente Comercial",
  "Gerente de Logística",
  "Gerente de Frota",
  "Supervisor de Operações",
  "Comprador",
];

const DOMINIOS_GENERICOS = new Set([
  "gmail.com", "hotmail.com", "outlook.com", "live.com", "yahoo.com", "yahoo.com.br", "uol.com.br", "bol.com.br",
  "terra.com.br", "ig.com.br", "globo.com", "icloud.com", "msn.com", "hotmail.com.br", "outlook.com.br", "r7.com",
]);

/**
 * Site provável a partir do domínio do e-mail da Receita (ex.: tributario@jtexpress.com.br → jtexpress.com.br).
 * Ignora provedores genéricos e domínios que parecem de escritório de contabilidade.
 */
export function sitePeloEmail(email: string | null) {
  const dominio = email?.split("@")[1]?.toLowerCase().trim();
  if (!dominio || DOMINIOS_GENERICOS.has(dominio)) return null;
  if (/contab|contadores|escritorio|assessoria/.test(dominio)) return null;
  return dominio;
}

/**
 * De quem parece ser o e-mail da Receita:
 * "contabilidade" = domínio de escritório contábil; "fiscal" = setor fiscal/tributário da própria empresa.
 */
export function tipoDoEmail(email: string | null): "contabilidade" | "fiscal" | null {
  const [local = "", dominio = ""] = (email ?? "").toLowerCase().split("@");
  if (/contab|contador|escritorio|assessoria/.test(dominio)) return "contabilidade";
  if (/contab|fiscal|tributari|financeiro|nfe|nota/.test(local)) return "fiscal";
  return null;
}

export const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter((p) => p.length > 2)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "•";
