"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Pencil, Plus, Search } from "lucide-react";
import { Glass, Micro } from "@/components/app/ui";
import { CATEGORIAS, EXEMPLOS, categoriaPorId, compradoresDaCategoria, formatarPreco, linkBusca, unirCompradores, type Produto, type ProdutoEntrada } from "@/lib/produtos";
import { ICONE_CATEGORIA } from "./icones";
import ProdutoForm from "./ProdutoForm";
import VenderPainel, { type Passo } from "./VenderPainel";

export type Atividade = { code: string; description: string; count: number };

type Props = {
  inicial: Produto[];
  limite: number | null;
  plano: string;
  atividades: Atividade[];
  iaLigada: boolean;
  remetente: { nome: string; empresa: string };
  temLink: boolean;
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Catálogo de produtos + "Quem compra o que eu vendo": cada produto já sabe quem compra e vira oferta. */
export default function Catalogo({ inicial, limite, plano, atividades, iaLigada, remetente, temLink }: Props) {
  const [produtos, setProdutos] = useState(inicial);
  const [filtro, setFiltro] = useState("todos");
  const [form, setForm] = useState<ProdutoEntrada | null>(null);
  const [vender, setVender] = useState<{ id: string; passo: Passo } | null>(null);

  const contagem = useMemo(() => new Map(atividades.map((a) => [a.code, a.count])), [atividades]);
  const compradoresNaBase = (codes: { code: string }[]) => codes.reduce((s, c) => s + (contagem.get(c.code) ?? 0), 0);

  const categoriasUsadas = useMemo(() => CATEGORIAS.filter((c) => produtos.some((p) => p.categoria === c.id)), [produtos]);
  const visiveis = filtro === "todos" ? produtos : produtos.filter((p) => p.categoria === filtro);
  const todos = useMemo(() => unirCompradores(produtos), [produtos]);
  const topo = useMemo(() => [...todos].sort((a, b) => (contagem.get(b.code) ?? 0) - (contagem.get(a.code) ?? 0)).slice(0, 6), [todos, contagem]);
  const cheio = limite !== null && produtos.length >= limite;
  const produtoVender = vender ? produtos.find((p) => p.id === vender.id) ?? null : null;

  const novo = (base?: Partial<ProdutoEntrada>) =>
    setForm({
      nome: "",
      descricao: "",
      categoria: "outro",
      preco: null,
      unidade: "un",
      pedidoMinimo: "",
      mostrarPreco: true,
      foto: null,
      compradores: [],
      compradoresFonte: "tabela",
      ...base,
    });

  return (
    <div className="space-y-4">
      <Glass className="p-6 md:p-8">
        {/* topo: título grande, uso do pacote e novo produto */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Micro>Quem compra o que eu vendo</Micro>
            <h2 className="mt-3 text-5xl font-light leading-none tracking-[-0.05em] md:text-7xl">
              Catálogo<span className="text-neon">.</span>
            </h2>
            <p className="mt-3 max-w-xl text-sm opacity-60">
              Cadastre o que você vende. O Oraklo mostra quem compra cada produto, abre essas empresas no mapa e monta a oferta.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="font-mono text-[11px] uppercase tracking-widest opacity-55 tabular-nums">
              {limite === null ? `${produtos.length} produtos` : `${produtos.length} de ${limite} produtos · ${plano}`}
            </span>
            {cheio ? (
              <Link href="/pacotes" className="flex min-h-11 items-center gap-2 rounded-full border border-night/15 px-5 text-sm hover:bg-white">
                Liberar mais produtos <ArrowRight size={15} aria-hidden />
              </Link>
            ) : (
              <button type="button" onClick={() => novo()} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-neon px-5 text-sm font-medium text-night hover:bg-neon-claro">
                <Plus size={16} aria-hidden /> Novo produto
              </button>
            )}
          </div>
        </div>

        {/* chips de categoria */}
        {produtos.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {[{ id: "todos", nome: "Todos" }, ...categoriasUsadas].map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={filtro === c.id}
                onClick={() => setFiltro(c.id)}
                className={`min-h-10 cursor-pointer rounded-full border px-5 text-sm transition-colors ${filtro === c.id ? "border-transparent bg-neon font-medium text-night" : "border-night/20 hover:border-night/50"}`}
              >
                {c.nome}
              </button>
            ))}
            <span className="ml-auto font-mono text-[11px] opacity-55 tabular-nums">
              Mostrando {visiveis.length} de {produtos.length}
            </span>
          </div>
        )}

        {/* máquina: quem compra tudo o que você vende */}
        {todos.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-5 rounded-[24px] bg-night p-5 text-white md:p-6">
            <div className="min-w-[180px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neon">Compradores em potencial</p>
              <p className="mt-1 text-4xl font-light tracking-[-0.04em] tabular-nums">{fmt(compradoresNaBase(todos))}</p>
              <p className="text-xs text-white/55">empresas na base que compram o que você vende</p>
            </div>
            <ul className="flex flex-1 flex-wrap gap-2">
              {topo.map((c) => (
                <li key={c.code} className="rounded-full bg-white/10 px-3 py-1.5 text-xs">
                  {c.descricao} <span className="font-mono text-neon tabular-nums">{fmt(contagem.get(c.code) ?? 0)}</span>
                </li>
              ))}
              {todos.length > topo.length && <li className="rounded-full px-2 py-1.5 text-xs text-white/50">+{todos.length - topo.length} tipos</li>}
            </ul>
            <Link href={linkBusca("Catálogo", todos)} className="flex min-h-11 items-center gap-2 rounded-full bg-neon px-5 text-sm font-medium text-night hover:bg-neon-claro">
              <Search size={15} aria-hidden /> Encontrar compradores de tudo
            </Link>
          </div>
        )}

        {/* grade de produtos */}
        <div className="mt-8 grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
          {visiveis.map((p) => (
            <Card
              key={p.id}
              p={p}
              compradores={compradoresNaBase(p.compradores)}
              onEditar={() => setForm({ ...p })}
              onQuemCompra={() => setVender({ id: p.id, passo: "quem" })}
              onVender={() => setVender({ id: p.id, passo: "oferta" })}
            />
          ))}

          {/* vazio: exemplos para começar */}
          {produtos.length === 0 &&
            EXEMPLOS.map((e) => {
              const exemplo: Produto = {
                ...e,
                id: e.nome,
                mostrarPreco: true,
                foto: null,
                compradores: compradoresDaCategoria(e.categoria),
                compradoresFonte: "tabela",
                criadoEm: "",
                atualizadoEm: "",
              };
              return (
                <Card
                  key={e.nome}
                  p={exemplo}
                  exemplo
                  compradores={compradoresNaBase(exemplo.compradores)}
                  onEditar={() => novo({ ...e, compradores: exemplo.compradores })}
                  onQuemCompra={() => novo({ ...e, compradores: exemplo.compradores })}
                  onVender={() => novo({ ...e, compradores: exemplo.compradores })}
                />
              );
            })}

          {!cheio && (
            <button
              type="button"
              onClick={() => novo()}
              className="group flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[24px] border-2 border-dashed border-night/15 text-sm opacity-70 transition-colors hover:border-night/40 hover:opacity-100"
            >
              <span className="flex size-12 items-center justify-center rounded-full bg-night text-neon transition-transform group-hover:scale-110">
                <Plus size={20} aria-hidden />
              </span>
              {produtos.length === 0 ? "Cadastrar meu primeiro produto" : "Adicionar produto"}
            </button>
          )}
        </div>
        {produtos.length === 0 && (
          <p className="mt-6 text-xs opacity-55">Os três primeiros são exemplos: clique em um deles para usar como base e trocar pelos seus dados.</p>
        )}
      </Glass>

      {form && (
        <ProdutoForm
          inicial={form}
          atividades={atividades}
          iaLigada={iaLigada}
          onFechar={() => setForm(null)}
          onSalvo={(p) => {
            setProdutos((l) => (l.some((x) => x.id === p.id) ? l.map((x) => (x.id === p.id ? p : x)) : [...l, p]));
            setForm(null);
          }}
          onExcluido={(id) => {
            setProdutos((l) => l.filter((x) => x.id !== id));
            setForm(null);
          }}
        />
      )}

      {produtoVender && vender && (
        <VenderPainel
          produto={produtoVender}
          passoInicial={vender.passo}
          contagem={contagem}
          iaLigada={iaLigada}
          remetente={remetente}
          temLink={temLink}
          onFechar={() => setVender(null)}
          onEditar={() => {
            setVender(null);
            setForm({ ...produtoVender });
          }}
        />
      )}
    </div>
  );
}

function Card({
  p,
  compradores,
  exemplo = false,
  onEditar,
  onQuemCompra,
  onVender,
}: {
  p: Produto;
  compradores: number;
  exemplo?: boolean;
  onEditar: () => void;
  onQuemCompra: () => void;
  onVender: () => void;
}) {
  const Icone = ICONE_CATEGORIA[p.categoria] ?? ICONE_CATEGORIA.outro;
  const cat = categoriaPorId(p.categoria);
  const nomes = p.compradores.slice(0, 2).map((c) => c.descricao);
  return (
    <article className="group flex flex-col">
      <button
        type="button"
        onClick={onEditar}
        aria-label={exemplo ? `Usar ${p.nome} como base` : `Editar ${p.nome}`}
        className="relative flex aspect-[4/3] cursor-pointer items-center justify-center overflow-hidden rounded-[24px] bg-night/[0.045] transition-colors hover:bg-night/[0.07]"
      >
        {p.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.foto} alt="" className="size-full object-contain p-6 transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <Icone size={64} strokeWidth={1.1} aria-hidden className="opacity-30 transition-transform duration-500 group-hover:scale-110" />
        )}
        <span className="absolute right-3 top-3 rounded-full border border-night/10 bg-white/80 px-2.5 py-1 text-[10px] font-medium">{cat.nome}</span>
        {exemplo ? (
          <span className="absolute left-3 top-3 rounded-full bg-neon px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest">Exemplo</span>
        ) : (
          <span className="absolute left-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/80 opacity-0 transition-opacity group-hover:opacity-100">
            <Pencil size={13} aria-hidden />
          </span>
        )}
      </button>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate text-lg font-medium tracking-[-0.02em]" title={p.nome}>
          {p.nome}
        </h3>
        <span className="shrink-0 text-lg font-light tabular-nums tracking-[-0.02em]">{formatarPreco(p).replace(/ \/ .*/, "")}</span>
      </div>
      <p className="mt-1 line-clamp-2 min-h-[2.5em] text-xs leading-relaxed opacity-55">{p.descricao || "Sem descrição"}</p>

      <p className="mt-3 truncate font-mono text-[11px] tabular-nums opacity-70" title={p.compradores.map((c) => c.descricao).join(", ")}>
        {p.compradores.length ? (
          <>
            <span className="text-night">{fmt(compradores)}</span> compradores · {nomes.join(", ")}
            {p.compradores.length > 2 ? ` +${p.compradores.length - 2}` : ""}
          </>
        ) : (
          "Defina quem compra este produto"
        )}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onQuemCompra} className="min-h-10 cursor-pointer rounded-full border border-night/15 text-sm hover:border-night/40">
          Quem compra
        </button>
        <button type="button" onClick={onVender} className="min-h-10 cursor-pointer rounded-full bg-night text-sm font-medium text-white">
          Vender
        </button>
      </div>
    </article>
  );
}
