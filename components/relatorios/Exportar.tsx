"use client";

import { Download, FileSpreadsheet } from "lucide-react";

/** Exportar o relatório: CSV (Excel) e PDF (impressão do navegador). */
export default function Exportar({ query }: { query: string }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <a href={`/api/relatorios?${query}`} className="flex min-h-11 items-center gap-2 rounded-full border border-night/15 bg-white/70 px-5 text-sm font-medium hover:bg-white">
        <FileSpreadsheet size={15} aria-hidden /> CSV
      </a>
      <button type="button" onClick={() => window.print()} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-night px-5 text-sm font-medium text-white hover:bg-neon hover:text-night">
        <Download size={15} aria-hidden /> Baixar PDF
      </button>
    </div>
  );
}
