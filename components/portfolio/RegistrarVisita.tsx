"use client";

import { useEffect } from "react";
import { registrarVisita } from "@/app/p/[id]/visita";

/** Conta a visita uma vez por sessão do navegador. */
export default function RegistrarVisita({ portfolioId, leadId }: { portfolioId: string; leadId: string | null }) {
  useEffect(() => {
    const chave = `oraklo:visita:${portfolioId}:${leadId ?? ""}`;
    try {
      if (sessionStorage.getItem(chave)) return;
      sessionStorage.setItem(chave, "1");
    } catch {
      // sem armazenamento: conta mesmo assim
    }
    void registrarVisita(portfolioId, leadId).catch(() => {});
  }, [portfolioId, leadId]);
  return null;
}
