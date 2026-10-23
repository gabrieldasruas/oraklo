"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Search, Sparkles, Trash2, X } from "lucide-react";
import { CATEGORIAS, MAX_COMPRADORES, adivinharCategoria, compradoresDaCategoria, type Comprador, type Produto, type ProdutoEntrada } from "@/lib/produtos";
import { excluirProduto, salvarProduto, sugerirCompradoresIA } from "@/app/(app)/portfolio/produtos";
import type { Atividade } from "./Catalogo";

const campo = "mt-1.5 min-h-11 w-full rounded-2xl border border-night/10 bg-white/70 px-4 text-sm outline-none focus:border-night/30";
const fmt = (n: number) => n.toLocaleString("pt-BR");
const semAcento = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Reduz a foto no navegador (lado maior 640px) para caber no catálogo. */
function reduzirFoto(file: File, max = 640): Promise<string> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      const png = file.type === "image/png";
      ok(c.toDataURL(png ? "image/png" : "image/jpeg", 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = erro;
    img.src = URL.createObjectURL(file);
  });
}

export default function ProdutoForm({
  inicial,
  atividades,
  iaLigada,
  onFechar,
  onSalvo,
  onExcluido,
}: {
  inicial: ProdutoEntrada;
  atividades: Atividade[];
  iaLigada: boolean;
  onFechar: () => void;
  onSalvo: (p: Produto) => void;
  onExcluido: (id: string) => void;
}) {
  const [p, setP] = useState<ProdutoEntrada>(inicial);
  const [catTocada, setCatTocada] = useState(inicial.categoria !== "outro");
  const [busca, setBusca] = useState("");
  const [ocupado, setOcupado] = useState<null | "salvar" | "ia" | "excluir">(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const contagem = useMemo(() => new Map(atividades.map((a) => [a.code, a.count])), [atividades]);
  const achadas = useMemo(() => {
    const t = semAcento(busca.trim());
    if (t.length < 2) return [];
    return atividades.filter((a) => semAcento(a.description).includes(t) || a.code.startsWith(t)).slice(0, 8);
  }, [busca, atividades]);

  const set = <K extends keyof ProdutoEntrada>(k: K, v: ProdutoEntrada[K]) => setP((s) => ({ ...s, [k]: v }));

  // ao digitar o nome, adivinha a categoria e já sugere quem compra (enquanto o usuário não escolheu à mão)
  function mudarNome(nome: string) {
    setP((s) => {
      if (catTocada) return { ...s, nome };
      const categoria = adivinharCategoria(`${nome} ${s.descricao}`);
      const trocar = categoria !== s.categoria && (s.compradores.length === 0 || s.compradoresFonte === "tabela");
      return { ...s, nome, categoria, ...(trocar ? { compradores: compradoresDaCategoria(categoria), compradoresFonte: "tabela" as const } : {}) };
    });
  }

  function mudarCategoria(categoria: string) {
    setCatTocada(true);
    setP((s) => ({ ...s, categoria, ...(s.compradoresFonte === "tabela" || s.compradores.length === 0 ? { compradores: compradoresDaCategoria(categoria), compradoresFonte: "tabela" as const } : {}) }));
  }

  const adicionar = (c: Comprador) =>
    setP((s) => (s.compradores.some((x) => x.code === c.code) || s.compradores.length >= MAX_COMPRADORES ? s : { ...s, compradores: [...s.compradores, c], compradoresFonte: "manual" }));
  const remover = (code: string) => setP((s) => ({ ...s, compradores: s.compradores.filter((c) => c.code !== code), compradoresFonte: "manual" }));

  async function comIA() {
    setOcupado("ia");
    setErro(null);
    setAviso(null);
    const r = await sugerirCompradoresIA({ nome: p.nome, descricao: p.descricao, categoria: p.categoria }).catch(() => ({ ok: false as const, erro: "Não foi possível falar com a IA." }));
    setOcupado(null);
    if (!r.ok) return setErro(r.erro);
    setP((s) => ({ ...s, compradores: r.compradores, compradoresFonte: "ia" }));
    if (r.foraDaBase) setAviso(`${r.foraDaBase} sugestão(ões) ficaram de fora porque ainda não há empresas desse tipo na base.`);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado("salvar");
    setErro(null);
    const r = await salvarProduto(p).catch(() => ({ ok: false as const, erro: "Não foi possível salvar o produto." }));
    setOcupado(null);
    if (!r.ok) return setErro(r.erro);
    onSalvo(r.produto);
  }

  async function excluir() {
    if (!p.id) return;
    setOcupado("excluir");
    const r = await excluirProduto(p.id).catch(() => ({ ok: false as const, erro: "Não foi possível excluir." }));
    setOcupado(null);
    if (!r.ok) return setErro(r.erro);
    onExcluido(p.id);
  }

  const total = p.compradores.reduce((s, c) => s + (contagem.get(c.code) ?? 0), 0);

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto max-h-[94vh] w-[min(46rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[28px] border border-white/70 bg-papel-cinza p-0 font-display text-night shadow-2xl backdrop:bg-sombra/50 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={salvar} className="p-6 md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-55">{p.id ? "Editar produto" : "Novo produto"}</p>
            <h2 className="mt-2 text-3xl font-light tracking-[-0.04em]">{p.nome || "Produto"}</h2>
          </div>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Fechar" className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-night/10 hover:bg-white">
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-[200px_1fr]">
          {/* foto */}
          <label className="group relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-[22px] bg-night/[0.05] text-xs opacity-80 hover:opacity-100">
            {p.foto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.foto} alt="" className="size-full object-contain p-3" />
            ) : (
              <>
                <ImagePlus size={26} aria-hidden className="opacity-50" />
                Adicionar foto
              </>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  set("foto", await reduzirFoto(f));
                } catch {
                  setErro("Não foi possível ler essa imagem.");
                }
              }}
            />
            {p.foto && (
              <button type="button" onClick={(e) => (e.preventDefault(), set("foto", null))} className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px]">
                Remover
              </button>
            )}
          </label>

          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Nome do produto
              <input className={campo} value={p.nome} onChange={(e) => mudarNome(e.target.value)} maxLength={90} placeholder="Ex.: Pneu de carga 295/80 R22.5" required autoFocus />
            </label>
            <label className="block text-sm font-medium">
              Descrição curta
              <input className={campo} value={p.descricao} onChange={(e) => set("descricao", e.target.value)} maxLength={280} placeholder="O que é, para quem serve, diferencial" />
            </label>
            <label className="block text-sm font-medium">
              Categoria
              <select className={`${campo} cursor-pointer`} value={p.categoria} onChange={(e) => mudarCategoria(e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* preço */}
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="block text-sm font-medium">
            Preço (R$)
            <input
              className={campo}
              inputMode="decimal"
              value={p.preco === null ? "" : String(p.preco).replace(".", ",")}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d,]/g, "").replace(",", ".");
                set("preco", v === "" ? null : Number(v));
              }}
              placeholder="0,00"
            />
          </label>
          <label className="block text-sm font-medium">
            Unidade
            <input className={campo} value={p.unidade} onChange={(e) => set("unidade", e.target.value)} maxLength={30} placeholder="un, caixa, kg" />
          </label>
          <label className="block text-sm font-medium">
            Pedido mínimo
            <input className={campo} value={p.pedidoMinimo} onChange={(e) => set("pedidoMinimo", e.target.value)} maxLength={60} placeholder="Ex.: 1 caixa" />
          </label>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" checked={!p.mostrarPreco} onChange={(e) => set("mostrarPreco", !e.target.checked)} className="size-4 accent-night" />
          Não mostrar o preço (aparece “sob consulta” no catálogo e nas ofertas)
        </label>

        {/* quem compra */}
        <section className="mt-7 rounded-[24px] bg-night p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon">Quem compra este produto</p>
              <p className="mt-1 text-sm text-white/65">
                <span className="text-white">{fmt(total)}</span> empresas na base · {p.compradoresFonte === "ia" ? "sugestão da IA" : p.compradoresFonte === "manual" ? "escolhido por você" : "sugestão da categoria"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setP((s) => ({ ...s, compradores: compradoresDaCategoria(s.categoria), compradoresFonte: "tabela" }))}
                className="min-h-9 cursor-pointer rounded-full border border-white/20 px-3.5 text-xs hover:bg-white/10"
              >
                Usar sugestão da categoria
              </button>
              <button
                type="button"
                onClick={() => void comIA()}
                disabled={!iaLigada || !p.nome.trim() || ocupado !== null}
                title={iaLigada ? "A IA sugere quem compra a partir do nome e da descrição" : "A IA liga quando a chave ANTHROPIC_API_KEY estiver configurada"}
                className="flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-neon px-3.5 text-xs font-medium text-night disabled:cursor-not-allowed disabled:opacity-40"
              >
                {ocupado === "ia" ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Sparkles size={13} aria-hidden />} Sugerir com IA
              </button>
            </div>
          </div>

          <ul className="mt-4 flex flex-wrap gap-2">
            {p.compradores.map((c) => (
              <li key={c.code} className="flex items-center gap-1.5 rounded-full bg-white/10 py-1.5 pl-3 pr-1.5 text-xs">
                {c.descricao}
                <span className="font-mono text-neon tabular-nums">{fmt(contagem.get(c.code) ?? 0)}</span>
                <button type="button" onClick={() => remover(c.code)} aria-label={`Remover ${c.descricao}`} className="flex size-5 cursor-pointer items-center justify-center rounded-full hover:bg-white/20">
                  <X size={11} aria-hidden />
                </button>
              </li>
            ))}
            {!p.compradores.length && <li className="text-xs text-white/55">Nenhum comprador ainda. Escolha a categoria, peça para a IA ou pesquise abaixo.</li>}
          </ul>

          <div className="relative mt-4">
            <Search size={14} aria-hidden className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/45" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Adicionar tipo de comprador: restaurante, borracharia, confecção…"
              className="min-h-10 w-full rounded-full border border-white/15 bg-white/5 pl-9 pr-4 text-sm text-white outline-none placeholder:text-white/40 focus:border-white/40"
            />
            {achadas.length > 0 && (
              <ul className="mt-2 max-h-56 overflow-y-auto rounded-2xl bg-white/5 p-1">
                {achadas.map((a) => (
                  <li key={a.code}>
                    <button
                      type="button"
                      onClick={() => {
                        adicionar({ code: a.code, descricao: a.description.slice(0, 90) });
                        setBusca("");
                      }}
                      className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs hover:bg-white/10"
                    >
                      <span className="min-w-0 truncate">{a.description}</span>
                      <span className="shrink-0 font-mono text-neon tabular-nums">{fmt(a.count)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {aviso && <p className="mt-3 text-xs text-white/60">{aviso}</p>}
        </section>

        {erro && <p className="mt-4 text-sm text-danger-600">{erro}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {p.id ? (
            confirmarExcluir ? (
              <span className="flex items-center gap-2 text-xs">
                Excluir este produto?
                <button type="button" onClick={() => void excluir()} className="cursor-pointer rounded-full bg-danger-600 px-3 py-1.5 font-medium text-white">
                  {ocupado === "excluir" ? "Excluindo…" : "Sim, excluir"}
                </button>
                <button type="button" onClick={() => setConfirmarExcluir(false)} className="cursor-pointer underline-offset-4 hover:underline">
                  Cancelar
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmarExcluir(true)} className="flex cursor-pointer items-center gap-1.5 text-xs opacity-60 hover:text-danger-600 hover:opacity-100">
                <Trash2 size={13} aria-hidden /> Excluir
              </button>
            )
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => ref.current?.close()} className="min-h-11 cursor-pointer rounded-full border border-night/15 px-5 text-sm hover:bg-white">
              Cancelar
            </button>
            <button type="submit" disabled={ocupado !== null} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-night px-6 text-sm font-medium text-white disabled:opacity-50">
              {ocupado === "salvar" && <Loader2 size={14} className="animate-spin" aria-hidden />} Salvar produto
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
