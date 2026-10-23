// Reuniões do CRM, compartilhadas entre servidor (actions) e cliente.
//
// As reuniões são guardadas como eventos em `lead_events` (que só aceita inserir):
//   meeting_created  { meetingId, title, start, end, category, notes }
//   meeting_updated  { meetingId, ...campos alterados }
//   meeting_canceled { meetingId }
// O estado atual de cada reunião é montado aplicando os eventos em ordem.

import { cores } from "@/lib/colors";
export const CATEGORIAS = [
  { id: "prospeccao", nome: "Prospecção", cor: cores["reuniao-prospeccao"], borda: cores["reuniao-prospeccao-borda"], texto: cores["reuniao-prospeccao-texto"] },
  { id: "reuniao", nome: "Reunião", cor: cores["reuniao-reuniao"], borda: cores["reuniao-reuniao-borda"], texto: cores["reuniao-reuniao-texto"] },
  { id: "followup", nome: "Follow-up", cor: cores["reuniao-followup"], borda: cores["reuniao-followup-borda"], texto: cores["reuniao-followup-texto"] },
  { id: "proposta", nome: "Proposta", cor: cores["reuniao-proposta"], borda: cores["reuniao-proposta-borda"], texto: cores["reuniao-proposta-texto"] },
  { id: "interno", nome: "Interno", cor: cores["reuniao-interno"], borda: cores["reuniao-interno-borda"], texto: cores["reuniao-interno-texto"] },
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
