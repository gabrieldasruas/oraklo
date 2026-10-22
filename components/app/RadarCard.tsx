import Link from "next/link";
import { ArrowUpRight, Lock, Radar } from "lucide-react";
import { Glass, Micro } from "@/components/app/ui";
import type { CompanyItem } from "@/lib/companies";
import { formatMoney, SIZE_LABEL } from "@/lib/format";
import { calcularScore, faixaScore } from "@/lib/score";

const haDias = (iso: string | null) => {
  if (!iso) return "";
  const d = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return d === 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`;
};

/** Radar de novas empresas: abertas recentemente e que combinam com o perfil. */
export default function RadarCard({ items, total, dias, mostrar, temPerfil }: { items: CompanyItem[]; total: number; dias: number; mostrar: number | null; temPerfil: boolean }) {
  const visiveis = mostrar === null ? items : items.slice(0, mostrar);
  const escondidas = total - visiveis.length;
  return (
    <Glass className="h-full p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-night text-neon">
            <Radar size={18} aria-hidden />
          </span>
          <div>
            <Micro>Radar de novas empresas</Micro>
            <p className="text-sm opacity-60">
              {total.toLocaleString("pt-BR")} abertas nos últimos {dias} dias{temPerfil ? " no seu perfil" : " nos nichos da base"}
            </p>
          </div>
        </div>
        {!temPerfil && (
          <Link href="/segmentacao#foco" className="rounded-full bg-neon px-3 py-1.5 text-[11px] font-medium text-night">
            Ajustar ao meu perfil
          </Link>
        )}
      </div>

      {visiveis.length ? (
        <ul className="mt-5 divide-y divide-night/10">
          {visiveis.map((e) => {
            const f = faixaScore(calcularScore(e).score);
            return (
              <li key={e.cnpj}>
                <Link href={`/empresas/${e.cnpj}`} className="group flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{e.name}</span>
                    <span className="block truncate text-xs opacity-55">
                      {e.city}/{e.uf} · {SIZE_LABEL[e.size] ?? "—"} · {formatMoney(e.shareCapital)}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] text-night" style={{ background: f.cor }}>
                    {f.rotulo}
                  </span>
                  <span className="w-16 shrink-0 text-right font-mono text-[10px] uppercase tracking-wider opacity-50">{haDias(e.openedAt)}</span>
                  <ArrowUpRight size={14} aria-hidden className="shrink-0 opacity-30 transition-opacity group-hover:opacity-100" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 text-sm opacity-60">Nenhuma empresa nova nesse período. O radar atualiza a cada importação da Receita.</p>
      )}

      {escondidas > 0 && mostrar !== null && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-night/5 px-4 py-3 text-xs">
          <Lock size={13} aria-hidden /> Mais {escondidas.toLocaleString("pt-BR")} no plano Profissional.
          <Link href="/configuracoes" className="ml-auto font-medium underline underline-offset-4">
            Ver planos
          </Link>
        </p>
      )}
    </Glass>
  );
}
