"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/app/ui";

// Baixa o CSV via POST (a exportação desconta da cota) e mostra o erro se a cota não comportar.
export default function ExportButton({ listId, rows }: { listId: string; rows: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportCsv() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${listId}/export`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Não foi possível exportar. Tente de novo.");
        return;
      }
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "lista.csv";
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      a.click();
      URL.revokeObjectURL(url);
      router.refresh(); // atualiza o uso da cota
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Pill onClick={exportCsv} disabled={pending || rows === 0}>
        {pending ? "Gerando CSV…" : `Exportar CSV (${rows.toLocaleString("pt-BR")})`}
      </Pill>
      <p aria-live="polite" className="max-w-xs text-right text-xs text-rose-700">
        {error}
      </p>
    </div>
  );
}
