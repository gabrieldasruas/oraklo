// Reuniões do CRM, compartilhadas entre servidor (actions) e cliente.
//
// As reuniões são guardadas como eventos em `lead_events` (que só aceita inserir):
//   meeting_created  { meetingId, title, start, end, category, notes }
//   meeting_updated  { meetingId, ...campos alterados }
//   meeting_canceled { meetingId }
// O estado atual de cada reunião é montado aplicando os eventos em ordem.

export const CATEGORIAS = [
  { id: "prospeccao", nome: "Prospecção", cor: "#e4fa8a", borda: "#9cc41a", texto: "#3d5c00" },
  { id: "reuniao", nome: "Reunião", cor: "#d8d0ff", borda: "#8f7cff", texto: "#3b2f8f" },
  { id: "followup", nome: "Follow-up", cor: "#bdeedc", borda: "#3fb994", texto: "#0f5c45" },
  { id: "proposta", nome: "Proposta", cor: "#ffd08a", borda: "#f0a030", texto: "#7a4500" },
  { id: "interno", nome: "Interno", cor: "#e2e2e6", borda: "#9a9aa3", texto: "#3a3a40" },
] as const;

export type CategoriaId = (typeof CATEGORIAS)[number]["id"];
export const categoria = (id: string) => CATEGORIAS.find((c) => c.id === id) ?? CATEGORIAS[1];

export type Reuniao = {
  id: string;
  leadId: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  category: CategoriaId;
  notes: string;
  canceled: boolean;
  createdAt: string;
};

export type ReuniaoInput = {
  leadId: string;
  title: string;
  start: string;
  end: string;
  category: CategoriaId;
  notes?: string;
  /** também move o lead para "Reunião marcada" */
  marcarLead?: boolean;
};
