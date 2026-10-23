"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Minus, Plus, ShoppingBag, X } from "lucide-react";
import { WhatsappIcon } from "@/components/brand/Icons";
import { ICONE_CATEGORIA } from "@/components/catalogo/icones";
import { pedirCotacao, registrarProdutoVisto } from "@/app/p/[id]/cotacao";

export type ProdutoVitrine = {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  categoriaNome: string;
  preco: string; // já formatado ("R$ 49,90 / garrafa" ou "Sob consulta")
  unidade: string;
  pedidoMinimo: string;
  foto: string | null;
};

type Props = {
  portfolioId: string;
  leadId: string | null;
  produtos: ProdutoVitrine[];
  empresa: string;
  cor: string;
  whatsapp: string | null;
};

const campo = "mt-1.5 min-h-11 w-full rounded-2xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/40";

/** Catálogo no link público: o comprador monta uma lista de cotação e o pedido vira lead no pipeline. */
export default function VitrinePublica({ portfolioId, leadId, produtos, empresa, cor, whatsapp }: Props) {
  const [filtro, setFiltro] = useState("todos");
  const [lista, setLista] = useState<Record<string, number>>({});
  const [aberto, setAberto] = useState<ProdutoVitrine | null>(null);
  const [pedindo, setPedindo] = useState(false);

  const categorias = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of produtos) m.set(p.categoria, p.categoriaNome);
    return [...m];
  }, [produtos]);
  const visiveis = filtro === "todos" ? produtos : produtos.filter((p) => p.categoria === filtro);
  const itens = produtos.filter((p) => lista[p.id]);
  const total = itens.length;

  const adicionar = (id: string) => setLista((l) => ({ ...l, [id]: (l[id] ?? 0) + 1 }));
  const mudar = (id: string, q: number) =>
    setLista((l) => {
      const n = { ...l };
      if (q <= 0) delete n[id];
      else n[id] = Math.min(100_000, q);
      return n;
    });

  function abrir(p: ProdutoVitrine) {
    setAberto(p);
    if (leadId) void registrarProdutoVisto(portfolioId, leadId, p.id).catch(() => {});
  }

  const destaque = { background: cor };

  return (
    <section id="produtos" className="mt-16 scroll-mt-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">Catálogo</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-5xl font-light tracking-[-0.05em] sm:text-6xl">Produtos</h2>
        <p className="max-w-sm text-sm text-white/55">Escolha os produtos e as quantidades. {empresa} responde com a cotação.</p>
      </div>

      {categorias.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {[["todos", "Todos"] as [string, string], ...categorias].map(([id, nome]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filtro === id}
              onClick={() => setFiltro(id)}
              className={`min-h-10 cursor-pointer rounded-full border px-5 text-sm transition-colors ${filtro === id ? "border-transparent font-medium text-night" : "border-white/20 hover:border-white/50"}`}
              style={filtro === id ? destaque : undefined}
            >
              {nome}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((p) => {
          const Icone = ICONE_CATEGORIA[p.categoria] ?? ICONE_CATEGORIA.outro;
          const q = lista[p.id] ?? 0;
          return (
            <article key={p.id} className="flex flex-col">
              <button type="button" onClick={() => abrir(p)} aria-label={`Ver ${p.nome}`} className="group relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-[22px] bg-white/[0.05] hover:bg-white/[0.08]">
                {p.foto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.foto} alt="" className="size-full object-contain p-6 transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <Icone size={60} strokeWidth={1.1} aria-hidden className="text-white/25 transition-transform duration-500 group-hover:scale-110" />
                )}
                <span className="absolute right-3 top-3 rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-white/75">{p.categoriaNome}</span>
              </button>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <h3 className="min-w-0 truncate text-lg font-medium tracking-[-0.02em]" title={p.nome}>
                  {p.nome}
                </h3>
                <span className="shrink-0 text-lg font-light tabular-nums">{p.preco.replace(/ \/ .*/, "")}</span>
              </div>
              <p className="mt-1 line-clamp-2 min-h-[2.5em] text-xs leading-relaxed text-white/50">{p.descricao}</p>
              {p.pedidoMinimo && <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/40">Mínimo: {p.pedidoMinimo}</p>}
              <div className="mt-4">
                {q ? (
                  <Quantidade valor={q} onMudar={(n) => mudar(p.id, n)} unidade={p.unidade} />
                ) : (
                  <button type="button" onClick={() => adicionar(p.id)} className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-white/20 text-sm hover:border-white/50">
                    <Plus size={15} aria-hidden /> Adicionar à cotação
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* barra da lista de cotação */}
      {total > 0 && !pedindo && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-xl items-center gap-3 rounded-full bg-white/10 p-2 pl-5 text-white shadow-[0_20px_50px_-20px_color-mix(in_srgb,var(--color-black)_80%,transparent)] backdrop-blur-xl">
            <ShoppingBag size={18} aria-hidden />
            <span className="flex-1 text-sm">
              Lista de cotação · <b>{total}</b> {total === 1 ? "produto" : "produtos"}
            </span>
            <button type="button" onClick={() => setPedindo(true)} className="min-h-11 cursor-pointer rounded-full px-5 text-sm font-medium text-night" style={destaque}>
              Pedir cotação
            </button>
          </div>
        </div>
      )}

      {aberto && (
        <Detalhe
          p={aberto}
          cor={cor}
          quantidade={lista[aberto.id] ?? 0}
          onAdicionar={() => adicionar(aberto.id)}
          onMudar={(n) => mudar(aberto.id, n)}
          onFechar={() => setAberto(null)}
        />
      )}

      {pedindo && (
        <Pedido
          portfolioId={portfolioId}
          leadId={leadId}
          empresa={empresa}
          cor={cor}
          whatsapp={whatsapp}
          itens={itens.map((p) => ({ p, q: lista[p.id] }))}
          onMudar={mudar}
          onFechar={() => setPedindo(false)}
          onEnviado={() => setLista({})}
        />
      )}
    </section>
  );
}

function Quantidade({ valor, onMudar, unidade }: { valor: number; onMudar: (n: number) => void; unidade: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between rounded-full bg-white/10 px-1.5">
      <button type="button" onClick={() => onMudar(valor - 1)} aria-label="Diminuir" className="flex size-8 cursor-pointer items-center justify-center rounded-full hover:bg-white/10">
        <Minus size={14} aria-hidden />
      </button>
      <label className="flex items-center gap-1.5 text-sm">
        <input
          type="number"
          min={0}
          value={valor}
          onChange={(e) => onMudar(Math.round(Number(e.target.value) || 0))}
          className="w-16 bg-transparent text-center tabular-nums outline-none [appearance:textfield]"
          aria-label="Quantidade"
        />
        <span className="text-xs text-white/50">{unidade || "un"}</span>
      </label>
      <button type="button" onClick={() => onMudar(valor + 1)} aria-label="Aumentar" className="flex size-8 cursor-pointer items-center justify-center rounded-full hover:bg-white/10">
        <Plus size={14} aria-hidden />
      </button>
    </div>
  );
}

function Modal({ titulo, onFechar, children }: { titulo: string; onFechar: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={titulo}
      onClose={onFechar}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto max-h-[94vh] w-[min(40rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[28px] border border-white/10 bg-night p-0 text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="relative p-6 sm:p-7">
        <button type="button" onClick={() => ref.current?.close()} aria-label="Fechar" className="absolute right-5 top-5 flex size-9 cursor-pointer items-center justify-center rounded-full border border-white/15 hover:bg-white/10">
          <X size={15} aria-hidden />
        </button>
        {children}
      </div>
    </dialog>
  );
}

function Detalhe({ p, cor, quantidade, onAdicionar, onMudar, onFechar }: { p: ProdutoVitrine; cor: string; quantidade: number; onAdicionar: () => void; onMudar: (n: number) => void; onFechar: () => void }) {
  const Icone = ICONE_CATEGORIA[p.categoria] ?? ICONE_CATEGORIA.outro;
  return (
    <Modal titulo={p.nome} onFechar={onFechar}>
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[22px] bg-white/[0.05]">
        {p.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.foto} alt={p.nome} className="size-full object-contain p-6" />
        ) : (
          <Icone size={80} strokeWidth={1} aria-hidden className="text-white/25" />
        )}
      </div>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{p.categoriaNome}</p>
      <h3 className="mt-1 text-3xl font-light tracking-[-0.04em]">{p.nome}</h3>
      <p className="mt-2 text-2xl font-light tabular-nums">{p.preco}</p>
      {p.descricao && <p className="mt-3 text-sm leading-relaxed text-white/65">{p.descricao}</p>}
      {p.pedidoMinimo && <p className="mt-2 text-xs text-white/45">Pedido mínimo: {p.pedidoMinimo}</p>}
      <div className="mt-6">
        {quantidade ? (
          <Quantidade valor={quantidade} onMudar={onMudar} unidade={p.unidade} />
        ) : (
          <button type="button" onClick={onAdicionar} className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium text-night" style={{ background: cor }}>
            <Plus size={16} aria-hidden /> Adicionar à cotação
          </button>
        )}
      </div>
    </Modal>
  );
}

function Pedido({
  portfolioId,
  leadId,
  empresa,
  cor,
  whatsapp,
  itens,
  onMudar,
  onFechar,
  onEnviado,
}: {
  portfolioId: string;
  leadId: string | null;
  empresa: string;
  cor: string;
  whatsapp: string | null;
  itens: { p: ProdutoVitrine; q: number }[];
  onMudar: (id: string, n: number) => void;
  onFechar: () => void;
  onEnviado: () => void;
}) {
  const [c, setC] = useState({ nome: "", empresa: "", email: "", telefone: "", mensagem: "" });
  const [aceite, setAceite] = useState(false);
  const [site, setSite] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [resumo] = useState(() => itens.map(({ p, q }) => `• ${q} ${p.unidade || "un"} — ${p.nome}`).join("\n"));

  const textoZap = `Olá! Quero uma cotação:\n${itens.map(({ p, q }) => `• ${q} ${p.unidade || "un"} — ${p.nome}`).join("\n")}`;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const r = await pedirCotacao({ portfolioId, leadId, itens: itens.map(({ p, q }) => ({ produtoId: p.id, quantidade: q })), contato: c, aceite, site }).catch(() => ({
      ok: false as const,
      erro: "Não foi possível enviar agora. Tente de novo.",
    }));
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setPronto(true);
    onEnviado();
  }

  if (pronto) {
    return (
      <Modal titulo="Pedido enviado" onFechar={onFechar}>
        <span className="flex size-14 items-center justify-center rounded-full text-night" style={{ background: cor }}>
          <Check size={26} aria-hidden />
        </span>
        <h3 className="mt-5 text-3xl font-light tracking-[-0.04em]">Pedido enviado</h3>
        <p className="mt-2 text-sm text-white/65">{empresa} recebeu sua lista e vai responder com a cotação pelo contato que você informou.</p>
        <pre className="mt-5 whitespace-pre-wrap rounded-2xl bg-white/5 p-4 font-sans text-sm text-white/80">{resumo}</pre>
      </Modal>
    );
  }

  return (
    <Modal titulo="Pedir cotação" onFechar={onFechar}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">Lista de cotação</p>
      <h3 className="mt-1 text-3xl font-light tracking-[-0.04em]">Pedir cotação</h3>

      <ul className="mt-5 space-y-2">
        {itens.map(({ p, q }) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/5 p-2 pl-4 sm:flex-nowrap sm:gap-3">
            <span className="min-w-0 flex-1 basis-full py-1 text-sm sm:basis-auto sm:truncate">{p.nome}</span>
            <div className="w-full shrink-0 sm:w-44">
              <Quantidade valor={q} onMudar={(n) => onMudar(p.id, n)} unidade={p.unidade} />
            </div>
          </li>
        ))}
        {!itens.length && <li className="text-sm text-white/55">Sua lista está vazia.</li>}
      </ul>

      <form onSubmit={enviar} className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Seu nome
          <input className={campo} value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} maxLength={80} required autoComplete="name" />
        </label>
        <label className="block text-sm">
          Empresa
          <input className={campo} value={c.empresa} onChange={(e) => setC({ ...c, empresa: e.target.value })} maxLength={80} required autoComplete="organization" />
        </label>
        <label className="block text-sm">
          E-mail
          <input className={campo} type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} maxLength={120} autoComplete="email" />
        </label>
        <label className="block text-sm">
          WhatsApp
          <input className={campo} type="tel" value={c.telefone} onChange={(e) => setC({ ...c, telefone: e.target.value })} maxLength={30} placeholder="(00) 00000-0000" autoComplete="tel" />
        </label>
        <label className="block text-sm sm:col-span-2">
          Mensagem (opcional)
          <textarea className={`${campo} min-h-20 resize-y py-3`} value={c.mensagem} onChange={(e) => setC({ ...c, mensagem: e.target.value })} maxLength={600} placeholder="Prazo de entrega, cidade, forma de pagamento…" />
        </label>
        {/* campo isca para robôs (escondido de pessoas) */}
        <input type="text" name="site" value={site} onChange={(e) => setSite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
        <label className="flex cursor-pointer items-start gap-2.5 text-xs text-white/65 sm:col-span-2">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-0.5 size-4 accent-white" />
          Aceito que {empresa} entre em contato comigo sobre esta cotação.
        </label>
        {erro && <p className="text-sm text-danger-400 sm:col-span-2">{erro}</p>}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button type="submit" disabled={enviando || !itens.length} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-full px-6 text-sm font-medium text-night disabled:opacity-50" style={{ background: cor }}>
            {enviando && <Loader2 size={15} className="animate-spin" aria-hidden />} Enviar pedido
          </button>
          {whatsapp && itens.length > 0 && (
            <a
              href={`https://wa.me/55${whatsapp}?text=${encodeURIComponent(textoZap)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center gap-2 rounded-full border border-white/20 px-5 text-sm hover:bg-white/10"
            >
              <WhatsappIcon size={15} /> Pedir pelo WhatsApp
            </a>
          )}
        </div>
      </form>
    </Modal>
  );
}
