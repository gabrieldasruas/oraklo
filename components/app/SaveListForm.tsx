"use client";

import { useActionState } from "react";
import { createListFromSearch, type ListActionState } from "@/app/(app)/listas/actions";
import { Pill } from "@/components/app/ui";

// Salva o resultado da busca atual como lista do workspace.
export default function SaveListForm({ query, total }: { query: string; total: number }) {
  const [state, action, pending] = useActionState<ListActionState, FormData>(createListFromSearch, {});
  const capped = total > 5000;
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="query" value={query} />
      <label className="block min-w-0 flex-1 text-sm font-medium">
        Salvar resultado como lista
        <input
          name="name"
          required
          maxLength={120}
          placeholder="Ex.: Transportadoras Grande Florianópolis"
          className="mt-2 min-h-12 w-full rounded-full border border-night/10 bg-white/80 px-5 text-base"
        />
      </label>
      <Pill type="submit" disabled={pending || total === 0}>
        {pending ? "Criando…" : "Criar lista"}
      </Pill>
      <p aria-live="polite" className="w-full text-xs opacity-60">
        {state.error ? <span className="text-danger-700 opacity-100">{state.error}</span> : capped ? "A lista guarda as 5.000 primeiras empresas (maior capital social)." : ""}
      </p>
    </form>
  );
}
