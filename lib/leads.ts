"use client";

import { useCallback, useEffect, useState } from "react";
import { createLead, deleteLead, listLeads, updateLeadStatus } from "@/app/(app)/leads/actions";
import type { Lead, LeadInput, Status } from "@/lib/lead-types";

export { STATUSES } from "@/lib/lead-types";
export type { Lead, Status } from "@/lib/lead-types";

// Chave da versão antiga, que guardava leads fictícios no navegador. Apagada na primeira visita.
const LEGACY_KEY = "prospecta:leads:v1";

// Leads do workspace, salvos no banco via Server Actions. Mesma interface da versão em localStorage,
// mais `updateStatus` e `error`. As alterações são otimistas e revertidas se o servidor falhar.
export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      // armazenamento indisponível (modo privado): nada a limpar
    }

    listLeads()
      .then(setLeads)
      .catch(() => setError("Não foi possível carregar os leads. Recarregue a página."))
      .finally(() => setLoaded(true));
  }, []);

  const addLead = useCallback(async (data: LeadInput) => {
    setError(null);
    try {
      const lead = await createLead(data);
      setLeads((prev) => [lead, ...prev]);
    } catch {
      setError("Não foi possível salvar o lead. Tente de novo.");
    }
  }, []);

  const removeLead = useCallback(async (id: string) => {
    setError(null);
    let removed: Lead | undefined;
    setLeads((prev) => {
      removed = prev.find((l) => l.id === id);
      return prev.filter((l) => l.id !== id);
    });
    try {
      await deleteLead(id);
    } catch {
      if (removed) setLeads((prev) => [removed!, ...prev]);
      setError("Não foi possível excluir o lead. Tente de novo.");
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: Status) => {
    setError(null);
    let before: Status | undefined;
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        before = l.status;
        return { ...l, status };
      }),
    );
    try {
      await updateLeadStatus(id, status);
    } catch {
      if (before) setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: before! } : l)));
      setError("Não foi possível atualizar o status. Tente de novo.");
    }
  }, []);

  // alterações já salvas no servidor (painel do lead, disparo de e-mail): só reflete na tela
  const substituir = useCallback((lead: Lead) => setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l))), []);
  const marcarEmSequencia = useCallback(
    (ids: string[]) => setLeads((prev) => prev.map((l) => (ids.includes(l.id) && l.status === "Novo" ? { ...l, status: "Em sequência" } : l))),
    [],
  );

  return { leads, loaded, error, addLead, removeLead, updateStatus, substituir, marcarEmSequencia };
}
