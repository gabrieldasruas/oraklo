// Eventos de lead (tabela `lead_events`, só insert/select): histórico, notas, tarefas e e-mails.
// Compartilhado entre servidor e cliente.

export type EventoLead = {
  id: number;
  leadId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type Tarefa = {
  id: string;
  leadId: string;
  titulo: string;
  vence: string | null; // ISO (dia)
  feita: boolean;
  criadaEm: string;
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Título curto de um evento para a linha do tempo. */
export function descreverEvento(e: EventoLead): { titulo: string; detalhe?: string; tom: "neutro" | "neon" | "sol" | "rosa" | "ceu" } {
  const p = e.payload ?? {};
  switch (e.type) {
    case "created":
      return { titulo: p.from === "busca" ? "Adicionado pela busca avançada" : "Lead criado", tom: "neutro" };
    case "status_changed":
      return { titulo: `Movido para ${str(p.status) || str(p.to)}`, tom: "ceu" };
    case "note":
      return { titulo: "Nota", detalhe: str(p.text), tom: "neutro" };
    case "task_created":
      return { titulo: `Tarefa criada: ${str(p.title)}`, detalhe: p.due ? `Para ${new Date(str(p.due)).toLocaleDateString("pt-BR")}` : undefined, tom: "sol" };
    case "task_done":
      return { titulo: p.done === false ? "Tarefa reaberta" : "Tarefa concluída", detalhe: str(p.title), tom: "sol" };
    case "email_sent":
      return {
        titulo: Number(p.step) > 1 ? `Follow-up enviado: ${str(p.subject)}` : `E-mail enviado: ${str(p.subject)}`,
        detalhe: p.followup && typeof p.followup === "object" ? `Follow-up automático em ${new Date(str((p.followup as { at?: string }).at)).toLocaleDateString("pt-BR")}` : undefined,
        tom: "neon",
      };
    case "email_opened":
      return { titulo: "Abriu o e-mail", detalhe: str(p.subject) || undefined, tom: "neon" };
    case "email_clicked":
      return { titulo: "Clicou num link do e-mail", detalhe: str(p.link) || undefined, tom: "neon" };
    case "email_bounced":
      return { titulo: "E-mail voltou (endereço inválido)", tom: "rosa" };
    case "email_replied":
      return { titulo: "Respondeu ao e-mail", tom: "sol" };
    case "portfolio_viewed":
      return { titulo: "Viu seu portfólio", tom: "neon" };
    case "meeting_created":
      return { titulo: `Reunião agendada: ${str(p.title)}`, detalhe: p.start ? new Date(str(p.start)).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : undefined, tom: "neon" };
    case "meeting_updated":
      return { titulo: "Reunião alterada", tom: "neutro" };
    case "meeting_canceled":
      return { titulo: "Reunião cancelada", tom: "rosa" };
    case "enriched":
      return { titulo: "Contato atualizado pelo enriquecimento", detalhe: [str(p.name), str(p.email)].filter(Boolean).join(" · "), tom: "ceu" };
    default:
      return { titulo: e.type, tom: "neutro" };
  }
}

/** Estado das tarefas a partir dos eventos (em ordem cronológica). */
export function montarTarefas(eventos: EventoLead[]): Tarefa[] {
  const m = new Map<string, Tarefa>();
  for (const e of [...eventos].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)) {
    const p = e.payload ?? {};
    const id = str(p.taskId);
    if (!id) continue;
    if (e.type === "task_created") m.set(id, { id, leadId: e.leadId, titulo: str(p.title), vence: str(p.due) || null, feita: false, criadaEm: e.createdAt });
    else if (e.type === "task_done") {
      const t = m.get(id);
      if (t) t.feita = p.done !== false;
    }
  }
  return [...m.values()];
}

/** "há 2 h", "ontem", "12/10". */
export function haQuanto(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** Variáveis aceitas nos modelos de e-mail. */
export const VARIAVEIS_EMAIL = ["{nome}", "{empresa}", "{meu_nome}", "{minha_empresa}", "{meu_telefone}", "{link_portfolio}"];
