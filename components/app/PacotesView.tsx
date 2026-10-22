import Link from "next/link";
import { ArrowRight, Check, Minus, Sparkles } from "lucide-react";
import { Aura, Glass, Micro, WireArt } from "@/components/app/ui";
import { COMPARACAO, LIMITES, NOME_PLANO, PACOTES, type Celula, type Pacote, type Plano } from "@/lib/pacotes";

type Uso = { pipeline: number; emails: number; ia: number; buscas: number };
const ARTE = { lilac: "rings", lime: "waves", mint: "fan", night: "orbit" } as const;

function linkDo(p: Pacote, email: string, logado: boolean) {
  if (p.plano === "gratis") return logado ? "/painel" : "/entrar";
  return `mailto:${email}?subject=${encodeURIComponent(`Quero o pacote ${p.nome} do Oraklo`)}&body=${encodeURIComponent("Oi! Quero assinar o pacote " + p.nome + " (" + p.preco + " " + p.periodo + ").")}`;
}

function CelulaComp({ v, escuro }: { v: Celula; escuro?: boolean }) {
  if (v === true)
    return (
      <span className={`inline-flex size-6 items-center justify-center rounded-full ${escuro ? "bg-neon text-night" : "bg-night text-neon"}`}>
        <Check size={13} aria-label="Incluso" />
      </span>
    );
  if (v === false) return <Minus size={15} aria-label="Não incluso" className="inline opacity-30" />;
  return <span className="text-sm">{v}</span>;
}

function BarraUso({ rotulo, usado, limite }: { rotulo: string; usado: number; limite: number | null }) {
  const pct = limite ? Math.min(100, (usado / limite) * 100) : 6;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate">{rotulo}</span>
        <span className="shrink-0 font-mono tabular-nums opacity-60">{limite === null ? `${usado} · ∞` : `${usado}/${limite}`}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-night/10">
        <div className={`h-full rounded-full ${limite !== null && pct >= 90 ? "bg-rose-500" : "bg-night"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Pacotes em colunas + comparação. Com `planoAtual`, marca o pacote em uso e mostra o consumo do mês. */
export default function PacotesView({ planoAtual = null, uso = null, emailContato }: { planoAtual?: Plano | null; uso?: Uso | null; emailContato: string }) {
  const logado = planoAtual !== null;
  const lim = planoAtual ? LIMITES[planoAtual] : null;

  return (
    <div className="space-y-4">
      {planoAtual && uso && lim && (
        <Glass className="grid items-center gap-5 p-5 md:grid-cols-[auto_1fr]">
          <div>
            <Micro>Seu pacote</Micro>
            <p className="mt-1 text-3xl font-light tracking-[-0.04em]">{NOME_PLANO[planoAtual]}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <BarraUso rotulo="Buscas na Busca avançada" usado={uso.buscas} limite={lim.buscasMes} />
            <BarraUso rotulo="Empresas no pipeline" usado={uso.pipeline} limite={lim.pipelineMes} />
            <BarraUso rotulo="E-mails disparados" usado={uso.emails} limite={lim.emailsMes} />
            <BarraUso rotulo="Textos com IA" usado={uso.ia} limite={lim.iaMes} />
          </div>
        </Glass>
      )}

      {/* colunas */}
      <section aria-label="Pacotes" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-4">
        {PACOTES.map((p) => {
          const escuro = p.tom === "night";
          const atual = planoAtual === p.plano && (p.id !== "premium3" || false);
          return (
            <Aura key={p.id} tone={p.tom} className={`relative flex flex-col p-6 md:p-7 ${p.destaque && !escuro ? "ring-2 ring-night" : ""}`}>
              <WireArt kind={ARTE[p.tom]} className={`absolute -bottom-10 -right-10 size-52 opacity-20 ${escuro ? "text-neon" : "text-night"}`} />
              <div className="relative flex items-start justify-between gap-2">
                <p className="text-lg font-medium tracking-[-0.02em]">{p.nome}</p>
                {atual ? (
                  <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${escuro ? "bg-white/15 text-white" : "bg-night text-white"}`}>Seu pacote</span>
                ) : (
                  p.destaque && <span className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${escuro ? "bg-neon text-night" : "bg-night text-neon"}`}>{p.destaque}</span>
                )}
              </div>
              <p className="relative mt-6 whitespace-nowrap text-[2.6rem] font-semibold leading-none tracking-[-0.05em]">{p.preco}</p>
              <p className={`relative mt-1.5 text-sm ${escuro ? "text-white/60" : "opacity-60"}`}>{p.periodo}</p>
              {p.nota && <p className={`relative mt-2 font-mono text-[11px] ${escuro ? "text-neon" : ""}`}>{p.nota}</p>}
              <p className={`relative mt-3 text-sm ${escuro ? "text-white/65" : "opacity-70"}`}>{p.descricao}</p>
              <ul className="relative mt-6 flex-1 space-y-2.5 text-sm">
                {p.itens.map((i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${escuro ? "bg-neon text-night" : "bg-night text-white"}`}>
                      <Check size={11} aria-hidden />
                    </span>
                    {i}
                  </li>
                ))}
              </ul>
              {atual ? (
                <span className={`relative mt-7 flex min-h-11 items-center justify-center rounded-full border text-sm ${escuro ? "border-white/20 text-white/70" : "border-night/20 opacity-70"}`}>Pacote atual</span>
              ) : (
                <a
                  href={linkDo(p, emailContato, logado)}
                  className={`group relative mt-7 flex min-h-11 items-center justify-center gap-2 rounded-full text-sm font-medium transition-transform hover:-translate-y-0.5 ${escuro ? "bg-neon text-night" : "bg-night text-white"}`}
                >
                  {p.cta} <ArrowRight size={15} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                </a>
              )}
            </Aura>
          );
        })}
      </section>

      {/* comparação */}
      <Glass className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 px-6 pb-2 pt-6">
          <div>
            <Micro>Compare os pacotes</Micro>
            <p className="mt-2 text-sm opacity-60">O Premium mensal e o de 3 meses têm os mesmos recursos; muda só a forma de pagar.</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-night/10">
                <th scope="col" className="w-[38%] px-6 py-4 font-mono text-[10px] font-normal uppercase tracking-widest opacity-50">
                  Recurso
                </th>
                {(["gratis", "premium", "ultra"] as const).map((pl) => (
                  <th key={pl} scope="col" className={`px-4 py-4 text-center text-sm font-medium ${pl === "ultra" ? "bg-night text-white" : pl === "premium" ? "bg-neon/30" : ""}`}>
                    {NOME_PLANO[pl]}
                    {planoAtual === pl && <span className="ml-1.5 align-middle font-mono text-[9px] uppercase tracking-widest opacity-60">· atual</span>}
                  </th>
                ))}
              </tr>
            </thead>
            {COMPARACAO.map((g) => (
              <tbody key={g.grupo}>
                <tr>
                  <th colSpan={4} scope="colgroup" className="bg-night/[0.03] px-6 pb-2 pt-5 text-left font-mono text-[10px] font-normal uppercase tracking-[0.2em] opacity-55">
                    {g.grupo}
                  </th>
                </tr>
                {g.linhas.map((l) => (
                  <tr key={l.recurso} className="border-b border-night/5">
                    <th scope="row" className="px-6 py-3.5 text-sm font-normal">
                      {l.recurso}
                    </th>
                    <td className="px-4 py-3.5 text-center">
                      <CelulaComp v={l.gratis} />
                    </td>
                    <td className="bg-neon/10 px-4 py-3.5 text-center">
                      <CelulaComp v={l.premium} />
                    </td>
                    <td className="bg-night px-4 py-3.5 text-center text-white">
                      <CelulaComp v={l.ultra} escuro />
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Glass>

      {/* times maiores */}
      <Aura tone="night" className="relative grid items-center gap-6 p-8 md:grid-cols-[1.2fr_1fr] md:p-12">
        <WireArt kind="orbit" spin className="absolute -right-20 -top-24 size-96 text-neon opacity-20" />
        <div className="relative">
          <Micro className="!opacity-60">Times e outras regiões</Micro>
          <h2 className="mt-3 text-4xl font-medium leading-[1] tracking-[-0.045em] md:text-5xl">Precisa de um plano sob medida?</h2>
          <p className="mt-4 max-w-md text-sm text-white/60">Base de outros estados, vários usuários e volume maior de e-mails. A gente monta junto com você.</p>
        </div>
        <div className="relative flex flex-wrap gap-3 md:justify-end">
          <a href={`mailto:${emailContato}?subject=${encodeURIComponent("Plano sob medida Oraklo")}`} className="flex min-h-12 items-center gap-2 rounded-full bg-neon px-6 text-sm font-medium text-night">
            <Sparkles size={15} aria-hidden /> Falar com a gente
          </a>
          {!logado && (
            <Link href="/entrar" className="flex min-h-12 items-center rounded-full border border-white/20 px-6 text-sm text-white hover:bg-white/10">
              Começar grátis
            </Link>
          )}
        </div>
      </Aura>

      <p className="px-1 text-xs opacity-55">Pagamento por Pix e cartão chegando. Enquanto isso, a assinatura é ativada pela nossa equipe depois do contato. Cancele quando quiser, sem multa.</p>
    </div>
  );
}
