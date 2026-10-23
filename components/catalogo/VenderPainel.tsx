"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Copy, Loader2, Mail, MapPinned, Pencil, Sparkles, X } from "lucide-react";
import { WhatsappIcon } from "@/components/brand/Icons";
import { formatarPreco, linkBusca, ofertaModelo, type Produto } from "@/lib/produtos";
import { escreverOfertaIA, salvarOfertaComoModelo } from "@/app/(app)/portfolio/produtos";
import { ICONE_CATEGORIA } from "./icones";

export type Passo = "quem" | "onde" | "oferta";

const PASSOS: { id: Passo; n: string; t: string }[] = [
  { id: "quem", n: "01", t: "Para quem" },
  { id: "onde", n: "02", t: "Onde" },
  { id: "oferta", n: "03", t: "Oferta" },
];
const fmt = (n: number) => n.toLocaleString("pt-BR");

/** "Vender este produto": compradores → mapa → oferta pronta. */
export default function VenderPainel({
  produto,
  passoInicial,
  contagem,
  iaLigada,
  remetente,
  temLink,
  onFechar,
  onEditar,
}: {
  produto: Produto;
  passoInicial: Passo;
  contagem: Map<string, number>;
  iaLigada: boolean;
  remetente: { nome: string; empresa: string };
  temLink: boolean;
  onFechar: () => void;
  onEditar: () => void;
}) {
  const [passo, setPasso] = useState<Passo>(passoInicial);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(produto.compradores.map((c) => c.code)));
  const [canal, setCanal] = useState<"whatsapp" | "email">("whatsapp");
  const inicialOferta = useMemo(() => ofertaModelo(produto, canal, remetente, temLink), [produto, canal, remetente, temLink]);
  const [oferta, setOferta] = useState(inicialOferta);
  const [ocupado, setOcupado] = useState<null | "ia" | "modelo">(null);
  const [retorno, setRetorno] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  useEffect(() => setOferta(inicialOferta), [inicialOferta]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  const escolhidos = produto.compradores.filter((c) => marcados.has(c.code));
  const total = escolhidos.reduce((s, c) => s + (contagem.get(c.code) ?? 0), 0);
  const maior = Math.max(1, ...produto.compradores.map((c) => contagem.get(c.code) ?? 0));
  const Icone = ICONE_CATEGORIA[produto.categoria] ?? ICONE_CATEGORIA.outro;

  async function comIA() {
    setOcupado("ia");
    setRetorno(null);
    const r = await escreverOfertaIA(produto.id, canal).catch(() => ({ ok: false as const, erro: "Não foi possível falar com a IA." }));
    setOcupado(null);
    if (!r.ok) return setRetorno({ tipo: "erro", texto: r.erro });
    setOferta({ assunto: r.assunto, texto: r.texto });
  }

  async function copiar() {
    const tx = canal === "email" && oferta.assunto ? `Assunto: ${oferta.assunto}\n\n${oferta.texto}` : oferta.texto;
    try {
      await navigator.clipboard.writeText(tx);
      setRetorno({ tipo: "ok", texto: "Copiado." });
    } catch {
      setRetorno({ tipo: "erro", texto: "Não foi possível copiar. Selecione o texto e copie à mão." });
    }
  }

  async function guardarModelo() {
    setOcupado("modelo");
    setRetorno(null);
    const r = await salvarOfertaComoModelo(`Oferta · ${produto.nome}`.slice(0, 40), oferta.texto).catch(() => ({ ok: false as const, erro: "Não foi possível salvar." }));
    setOcupado(null);
    setRetorno(r.ok ? { tipo: "ok", texto: "Salvo nos modelos de WhatsApp: já aparece no botão de WhatsApp de cada lead." } : { tipo: "erro", texto: r.erro });
  }

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Fechar" onClick={onFechar} className="absolute inset-0 cursor-default bg-sombra/40 backdrop-blur-[2px]" />
      <aside
        role="dialog"
        aria-label={`Vender ${produto.nome}`}
        className="drawer-in absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col overflow-hidden bg-papel font-display text-night shadow-[0_0_80px_-20px_color-mix(in_srgb,var(--color-black)_60%,transparent)]"
      >
        {/* cabeçalho do produto */}
        <header className="relative overflow-hidden bg-night p-6 text-white">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-neon) 60%, transparent), transparent 70%)" }} />
          <div className="relative flex items-start gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10">
              {produto.foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={produto.foto} alt="" className="size-full object-contain p-1.5" />
              ) : (
                <Icone size={28} strokeWidth={1.3} aria-hidden className="text-neon" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon">Vender este produto</p>
              <h2 className="mt-1 truncate text-2xl font-light tracking-[-0.03em]">{produto.nome}</h2>
              <p className="text-sm text-white/60">
                {formatarPreco(produto)}
                {produto.pedidoMinimo ? ` · mínimo ${produto.pedidoMinimo}` : ""}
              </p>
            </div>
            <button type="button" onClick={onFechar} aria-label="Fechar" className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/20 hover:bg-white/10">
              <X size={15} aria-hidden />
            </button>
          </div>

          {/* passos */}
          <nav aria-label="Passos" className="relative mt-6 grid grid-cols-3 gap-2">
            {PASSOS.map((s) => {
              const on = passo === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPasso(s.id)}
                  aria-current={on ? "step" : undefined}
                  className={`flex cursor-pointer flex-col items-start rounded-2xl px-3 py-2.5 text-left transition-colors ${on ? "bg-neon text-night" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
                >
                  <span className="font-mono text-[10px] opacity-70">{s.n}</span>
                  <span className="text-sm font-medium">{s.t}</span>
                </button>
              );
            })}
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {/* 01 · para quem */}
          {passo === "quem" && (
            <section>
              <p className="text-sm opacity-65">Tipos de empresa que compram este produto. Desmarque os que não quer abordar agora.</p>
              {produto.compradores.length ? (
                <ul className="mt-5 space-y-2">
                  {produto.compradores.map((c) => {
                    const n = contagem.get(c.code) ?? 0;
                    const on = marcados.has(c.code);
                    return (
                      <li key={c.code}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => setMarcados((s) => {
                            const x = new Set(s);
                            if (x.has(c.code)) x.delete(c.code);
                            else x.add(c.code);
                            return x;
                          })}
                          className={`relative flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3 text-left transition-colors ${on ? "border-night/20 bg-white" : "border-transparent bg-white/40 opacity-55"}`}
                        >
                          <span aria-hidden className="absolute inset-y-0 left-0 bg-neon/25" style={{ width: `${(n / maior) * 100}%` }} />
                          <span className={`relative flex size-5 shrink-0 items-center justify-center rounded-full border ${on ? "border-night bg-night text-neon" : "border-night/30"}`}>{on && <Check size={11} aria-hidden />}</span>
                          <span className="relative min-w-0 flex-1 truncate text-sm">{c.descricao}</span>
                          <span className="relative font-mono text-xs tabular-nums">{fmt(n)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-5 rounded-2xl bg-white/60 p-4 text-sm">Este produto ainda não tem compradores definidos.</p>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={onEditar} className="flex cursor-pointer items-center gap-1.5 text-xs opacity-65 hover:opacity-100">
                  <Pencil size={12} aria-hidden /> Editar compradores
                </button>
                <button type="button" onClick={() => setPasso("onde")} disabled={!escolhidos.length} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-night px-5 text-sm font-medium text-white disabled:opacity-40">
                  {fmt(total)} empresas · Próximo <ArrowRight size={15} aria-hidden />
                </button>
              </div>
            </section>
          )}

          {/* 02 · onde */}
          {passo === "onde" && (
            <section>
              <div className="rounded-[24px] bg-white p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-55">Compradores na base</p>
                <p className="mt-2 text-6xl font-light tracking-[-0.05em] tabular-nums">{fmt(total)}</p>
                <p className="mt-1 text-sm opacity-60">empresas de {escolhidos.length} tipo{escolhidos.length === 1 ? "" : "s"} que compram {produto.nome}.</p>
              </div>
              <ol className="mt-5 space-y-3 text-sm">
                {[
                  "No mapa, escolha a cidade e o raio que você atende.",
                  "Veja as empresas com telefone, e-mail e WhatsApp, ordenadas pelo score.",
                  "Selecione as melhores e mande para o pipeline com um clique.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="font-mono text-[11px] text-night/45">{String(i + 1).padStart(2, "0")}</span>
                    {t}
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setPasso("oferta")} className="cursor-pointer text-xs opacity-65 underline-offset-4 hover:underline hover:opacity-100">
                  Montar a oferta primeiro
                </button>
                <Link
                  href={linkBusca(produto.nome, escolhidos)}
                  aria-disabled={!escolhidos.length}
                  className="flex min-h-12 items-center gap-2 rounded-full bg-neon px-6 text-sm font-medium text-night hover:bg-neon-claro"
                >
                  <MapPinned size={16} aria-hidden /> Abrir compradores no mapa
                </Link>
              </div>
            </section>
          )}

          {/* 03 · oferta */}
          {passo === "oferta" && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-full border border-night/10 bg-white/60 p-1">
                  {(
                    [
                      { id: "whatsapp", t: "WhatsApp", I: WhatsappIcon },
                      { id: "email", t: "E-mail", I: Mail },
                    ] as const
                  ).map(({ id, t, I }) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={canal === id}
                      onClick={() => setCanal(id)}
                      className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-4 text-sm ${canal === id ? "bg-night font-medium text-white" : "hover:bg-white"}`}
                    >
                      <I size={14} /> {t}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void comIA()}
                  disabled={!iaLigada || ocupado !== null}
                  title={iaLigada ? "A IA reescreve a oferta para este produto" : "A IA liga quando a chave ANTHROPIC_API_KEY estiver configurada"}
                  className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-neon px-4 text-xs font-medium text-night disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {ocupado === "ia" ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Sparkles size={13} aria-hidden />} Escrever com IA
                </button>
              </div>

              {canal === "email" && (
                <label className="mt-5 block text-sm font-medium">
                  Assunto
                  <input
                    value={oferta.assunto}
                    onChange={(e) => setOferta((o) => ({ ...o, assunto: e.target.value }))}
                    className="mt-1.5 min-h-11 w-full rounded-2xl border border-night/10 bg-white/70 px-4 text-sm outline-none focus:border-night/30"
                  />
                </label>
              )}
              <label className="mt-4 block text-sm font-medium">
                Mensagem
                <textarea
                  value={oferta.texto}
                  onChange={(e) => setOferta((o) => ({ ...o, texto: e.target.value }))}
                  rows={canal === "email" ? 11 : 7}
                  className="mt-1.5 w-full resize-y rounded-2xl border border-night/10 bg-white/70 p-4 text-sm leading-relaxed outline-none focus:border-night/30"
                />
              </label>
              <p className="mt-2 text-[11px] opacity-55">
                <code>{"{nome}"}</code> e <code>{"{empresa}"}</code> viram os dados de cada lead no envio{temLink ? <>; <code>{"{link_portfolio}"}</code> vira o link do seu portfólio</> : null}.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => void copiar()} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-night/15 px-5 text-sm hover:bg-white">
                  <Copy size={14} aria-hidden /> Copiar
                </button>
                {canal === "whatsapp" ? (
                  <button type="button" onClick={() => void guardarModelo()} disabled={ocupado !== null} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-night px-5 text-sm font-medium text-white disabled:opacity-50">
                    {ocupado === "modelo" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <WhatsappIcon size={14} />} Salvar como modelo de WhatsApp
                  </button>
                ) : (
                  <Link href="/leads" className="flex min-h-11 items-center gap-2 rounded-full bg-night px-5 text-sm font-medium text-white">
                    <Mail size={14} aria-hidden /> Disparar pelos Leads
                  </Link>
                )}
              </div>
              {canal === "email" && <p className="mt-2 text-[11px] opacity-55">Copie a oferta e cole no “Disparar e-mails” dos Leads, que envia em lote com follow-up.</p>}
              {retorno && <p className={`mt-3 text-xs ${retorno.tipo === "ok" ? "text-good-700" : "text-danger-600"}`}>{retorno.texto}</p>}

              <div className="mt-8 rounded-2xl bg-white/60 p-4 text-xs leading-relaxed">
                <b>Próximo passo:</b> abra os compradores no mapa, mande as melhores empresas para o pipeline e use esta oferta no WhatsApp ou no disparo de e-mails.
                <Link href={linkBusca(produto.nome, escolhidos)} className="ml-1 font-medium underline underline-offset-4">
                  Abrir no mapa
                </Link>
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
