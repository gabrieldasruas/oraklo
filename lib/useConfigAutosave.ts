"use client";

import { useEffect, useRef, useState } from "react";
import type { ConfigWorkspace } from "./config-workspace";
import { salvarConfig } from "@/app/(app)/configuracoes/actions";

/** Estado da configuração do workspace com salvamento automático (Configurações e Integrar CRM). */
export function useConfigAutosave(inicial: ConfigWorkspace) {
  const [c, setC] = useState(inicial);
  const [estado, setEstado] = useState<"ok" | "salvando" | "erro">("ok");
  const [erro, setErro] = useState<string | null>(null);
  const ultimo = useRef(JSON.stringify(inicial));

  useEffect(() => {
    const atual = JSON.stringify(c);
    if (atual === ultimo.current) return;
    setEstado("salvando");
    setErro(null);
    const t = setTimeout(() => {
      salvarConfig(c)
        .then((salvo) => {
          ultimo.current = JSON.stringify(salvo);
          setEstado("ok");
        })
        .catch((e) => {
          setEstado("erro");
          setErro(e instanceof Error ? e.message : "Não foi possível salvar");
        });
    }, 900);
    return () => clearTimeout(t);
  }, [c]);

  /** Configuração que já veio salva do servidor (ex.: conectar o RD): só atualiza a tela. */
  const doServidor = (cfg: ConfigWorkspace) => {
    ultimo.current = JSON.stringify(cfg);
    setC(cfg);
  };

  return { c, setC, estado, erro, doServidor };
}
