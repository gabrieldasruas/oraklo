// Tipos e constantes de leads, compartilhados entre servidor (actions) e cliente (useLeads).
export const STATUSES = ["Novo", "Em sequência", "Respondeu", "Reunião marcada", "Sem interesse"] as const;

export type Status = (typeof STATUSES)[number];

export type Lead = {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  place: string;
  status: Status;
  score: number;
  createdAt: string; // ISO
  last?: string; // texto livre (legado dos exemplos)
};

export type LeadInput = Omit<Lead, "id" | "createdAt" | "last">;
