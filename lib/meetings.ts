"use client";

import { useCallback, useEffect, useState } from "react";
import { atualizarReuniao, cancelarReuniao, criarReuniao, listarReunioes } from "@/app/(app)/leads/reunioes";
import type { Reuniao, ReuniaoInput } from "@/lib/meeting-types";

// Reuniões do workspace (salvas no banco). Alterações otimistas, desfeitas se o servidor falhar.
export function useReunioes() {
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [carregadas, setCarregadas] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listarReunioes()
      .then(setReunioes)
      .catch(() => setErro("Não foi possível carregar as reuniões."))
      .finally(() => setCarregadas(true));
  }, []);

  const agendar = useCallback(async (input: ReuniaoInput) => {
    setErro(null);
    try {
      const r = await criarReuniao(input);
      setReunioes((prev) => [...prev, r]);
      return r;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível agendar a reunião.");
      return null;
    }
  }, []);

  const alterar = useCallback(async (r: Reuniao, campos: Partial<Pick<Reuniao, "title" | "start" | "end" | "category" | "notes">>) => {
    setErro(null);
    setReunioes((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...campos } : x)));
    try {
      await atualizarReuniao(r.leadId, r.id, campos);
    } catch {
      setReunioes((prev) => prev.map((x) => (x.id === r.id ? r : x)));
      setErro("Não foi possível alterar a reunião.");
    }
  }, []);

  const cancelar = useCallback(async (r: Reuniao) => {
    setErro(null);
    setReunioes((prev) => prev.filter((x) => x.id !== r.id));
    try {
      await cancelarReuniao(r.leadId, r.id);
    } catch {
      setReunioes((prev) => [...prev, r]);
      setErro("Não foi possível cancelar a reunião.");
    }
  }, []);

  return { reunioes, carregadas, erro, agendar, alterar, cancelar };
}
