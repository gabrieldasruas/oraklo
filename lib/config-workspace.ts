// Configurações do workspace (assinatura, notificações, CRM, WhatsApp), guardadas em `lists` com tag interna.
// Compartilhado entre servidor e cliente.

export const CONFIG_TAG = "__config__";
/** token do RD Station, cifrado (linha separada, nunca vai para o navegador) */
export const RD_TOKEN_TAG = "__rd_token__";

const ETAPAS_OK = ["Novo", "Em sequência", "Respondeu", "Reunião marcada", "Sem interesse"];

export type ConfigRd = {
  conectado: boolean;
  conta: { nome: string; email: string; organizacao: string } | null;
  funilId: string;
  /** etapa do Oraklo → id da etapa no RD */
  etapas: Record<string, string>;
  enviarNovos: boolean;
  sincronizarEtapas: boolean;
  anotacoes: boolean;
};

export type ModeloWhatsapp = { id: string; nome: string; texto: string };

export const EVENTOS_CRM = [
  { id: "lead.criado", t: "Lead criado" },
  { id: "lead.etapa", t: "Lead mudou de etapa" },
  { id: "lead.respondeu", t: "Lead respondeu" },
  { id: "reuniao.marcada", t: "Reunião marcada" },
] as const;
export type EventoCrm = (typeof EVENTOS_CRM)[number]["id"];

export type ConfigWorkspace = {
  assinatura: string;
  notificar: { resumoSemanal: boolean; radar: boolean };
  crm: { ativo: boolean; webhookUrl: string; eventos: EventoCrm[] };
  whatsapp: { modelos: ModeloWhatsapp[] };
  rd: ConfigRd;
};

export const MODELOS_PADRAO: ModeloWhatsapp[] = [
  { id: "apresentacao", nome: "Apresentação", texto: "Oi, {nome}! Tudo bem? Sou {meu_nome}, da {minha_empresa}. Ajudamos empresas como a {empresa} a vender mais. Posso te mandar uma apresentação rápida?" },
  { id: "followup", nome: "Follow-up", texto: "Oi, {nome}! Passando para saber se conseguiu ver minha mensagem. Faz sentido conversarmos 15 minutos esta semana?" },
  { id: "reuniao", nome: "Confirmar reunião", texto: "Oi, {nome}! Confirmando nossa conversa. Qualquer coisa, é só me chamar por aqui." },
];

export const CONFIG_PADRAO: ConfigWorkspace = {
  assinatura: "",
  notificar: { resumoSemanal: false, radar: true },
  crm: { ativo: false, webhookUrl: "", eventos: ["lead.criado", "lead.etapa", "lead.respondeu", "reuniao.marcada"] },
  whatsapp: { modelos: MODELOS_PADRAO },
  rd: { conectado: false, conta: null, funilId: "", etapas: {}, enviarNovos: true, sincronizarEtapas: true, anotacoes: true },
};

const eventoValido = (e: unknown): e is EventoCrm => EVENTOS_CRM.some((x) => x.id === e);

export function completarConfig(c: Partial<ConfigWorkspace> | null | undefined): ConfigWorkspace {
  const d = CONFIG_PADRAO;
  if (!c) return structuredClone(d);
  const modelos = Array.isArray(c.whatsapp?.modelos)
    ? c.whatsapp!.modelos
        .filter((m) => m && typeof m.texto === "string")
        .slice(0, 12)
        .map((m) => ({ id: String(m.id || Math.random().toString(36).slice(2, 8)).slice(0, 20), nome: String(m.nome ?? "Modelo").slice(0, 40), texto: String(m.texto).slice(0, 1000) }))
    : d.whatsapp.modelos;
  return {
    assinatura: String(c.assinatura ?? "").slice(0, 600),
    notificar: { resumoSemanal: !!c.notificar?.resumoSemanal, radar: c.notificar?.radar !== false },
    crm: {
      ativo: !!c.crm?.ativo,
      webhookUrl: String(c.crm?.webhookUrl ?? "").trim().slice(0, 500),
      eventos: Array.isArray(c.crm?.eventos) ? c.crm!.eventos.filter(eventoValido) : d.crm.eventos,
    },
    whatsapp: { modelos: modelos.length ? modelos : d.whatsapp.modelos },
    rd: {
      conectado: !!c.rd?.conectado,
      conta: c.rd?.conta ? { nome: String(c.rd.conta.nome ?? "").slice(0, 80), email: String(c.rd.conta.email ?? "").slice(0, 120), organizacao: String(c.rd.conta.organizacao ?? "").slice(0, 120) } : null,
      funilId: String(c.rd?.funilId ?? "").slice(0, 40),
      etapas: Object.fromEntries(Object.entries(c.rd?.etapas ?? {}).filter(([k, v]) => ETAPAS_OK.includes(k) && typeof v === "string").map(([k, v]) => [k, String(v).slice(0, 40)])),
      enviarNovos: c.rd?.enviarNovos !== false,
      sincronizarEtapas: c.rd?.sincronizarEtapas !== false,
      anotacoes: c.rd?.anotacoes !== false,
    },
  };
}

/** Só aceita webhooks https públicos (evita mandar dados para a rede interna do servidor). */
export function webhookPermitido(url: string) {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return false;
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(h)) {
      const [a, b] = h.split(".").map(Number);
      if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return false;
    }
    if (h.startsWith("[") || h.includes(":")) return false;
    return true;
  } catch {
    return false;
  }
}
