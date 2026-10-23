"use client";

import { cores } from "@/lib/colors";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  Link2,
  ImagePlus,
  Loader2,
  Mail,
  Palette,
  Plus,
  Presentation,
  Rocket,
  Sheet,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { Glass, Micro } from "@/components/app/ui";
import Slides from "./Slides";
import { baixarArquivo, enviarArquivo, estatisticasPortfolio, removerArquivo, salvarPortfolio } from "@/app/(app)/portfolio/actions";
import { listLeads } from "@/app/(app)/leads/actions";
import type { Lead } from "@/lib/lead-types";
import { interpretarCsv, lerCsv, novoId, preencherEmail, type ArquivoResumo, type Portfolio } from "@/lib/portfolio-types";
import { iniciais } from "@/lib/crm";

type Aba = "portfolio" | "solucoes";
const CORES = [cores.neon, cores["portfolio-amarelo"], cores["portfolio-ciano"], cores["portfolio-lilas"], cores["portfolio-coral"], cores.night];
const VARIAVEIS = ["{nome}", "{empresa}", "{meu_nome}", "{minha_empresa}", "{solucoes}", "{meu_telefone}", "{meu_site}", "{link_portfolio}"];

const tamanho = (b: number) => (b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`);

/** Reduz uma imagem no navegador (lado maior `max`) e devolve data URL. */
function reduzirImagem(file: File, max = 420): Promise<string> {
  return new Promise((ok, erro) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      ok(c.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.85));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = erro;
    img.src = URL.createObjectURL(file);
  });
}

// ---------- campos ----------
const estiloCampo = "mt-1.5 min-h-11 w-full rounded-2xl border border-night/10 bg-white/90 px-4 text-sm focus:border-night focus:outline-none";
function Campo({ rotulo, valor, onChange, placeholder, max = 120 }: { rotulo: string; valor: string; onChange: (v: string) => void; placeholder?: string; max?: number }) {
  return (
    <label className="block text-sm font-medium">
      {rotulo}
      <input value={valor} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={estiloCampo} />
    </label>
  );
}
function Area({ rotulo, valor, onChange, linhas = 4, max = 2000 }: { rotulo: string; valor: string; onChange: (v: string) => void; linhas?: number; max?: number }) {
  return (
    <label className="block text-sm font-medium">
      {rotulo}
      <textarea value={valor} maxLength={max} rows={linhas} onChange={(e) => onChange(e.target.value)} className={`${estiloCampo} py-3 leading-relaxed`} />
    </label>
  );
}
/** Etiquetas editáveis (Enter ou vírgula adiciona). */
function Etiquetas({ rotulo, itens, onChange, placeholder }: { rotulo: string; itens: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [txt, setTxt] = useState("");
  const add = () => {
    const novos = txt.split(",").map((s) => s.trim()).filter(Boolean);
    if (novos.length) onChange([...itens, ...novos]);
    setTxt("");
  };
  return (
    <div>
      <p className="text-sm font-medium">{rotulo}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5 rounded-2xl border border-night/10 bg-white/90 p-2">
        {itens.map((t, i) => (
          <button key={t + i} type="button" onClick={() => onChange(itens.filter((_, j) => j !== i))} className="flex cursor-pointer items-center gap-1 rounded-full bg-night px-3 py-1 text-xs text-white" title="Remover">
            {t} <X size={11} aria-hidden />
          </button>
        ))}
        <input
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          onBlur={add}
          placeholder={placeholder}
          className="min-w-32 flex-1 bg-transparent px-2 text-sm focus:outline-none"
        />
      </div>
    </div>
  );
}
function Secao({ titulo, children, icone: Icone }: { titulo: string; children: React.ReactNode; icone: typeof Mail }) {
  return (
    <Glass className="no-fx space-y-4 p-5">
      <p className="flex items-center gap-2 text-base font-medium tracking-[-0.01em]">
        <span className="flex size-8 items-center justify-center rounded-xl bg-night text-neon">
          <Icone size={15} aria-hidden />
        </span>
        {titulo}
      </p>
      {children}
    </Glass>
  );
}

export default function PortfolioStudio({ inicial, arquivosIniciais }: { inicial: Portfolio; arquivosIniciais: ArquivoResumo[] }) {
  const [p, setP] = useState<Portfolio>(inicial);
  const [aba, setAba] = useState<Aba>("portfolio");
  const [salvo, setSalvo] = useState<"ok" | "salvando" | "erro">("ok");
  const [arquivos, setArquivos] = useState(arquivosIniciais);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadEmail, setLeadEmail] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [stats, setStats] = useState<{ id: string | null; total: number; semana: number; ultima: string | null } | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  // último conteúdo salvo: só salva de novo quando algo mudou de verdade
  const ultimoSalvo = useRef(JSON.stringify(inicial));
  const inputArquivo = useRef<HTMLInputElement>(null);

  // salva sozinho 1,2 s depois da última mudança
  useEffect(() => {
    const atual = JSON.stringify(p);
    if (atual === ultimoSalvo.current) return;
    setSalvo("salvando");
    const t = setTimeout(() => {
      salvarPortfolio(p)
        .then(() => {
          ultimoSalvo.current = atual;
          setSalvo("ok");
        })
        .catch(() => setSalvo("erro"));
    }, 1200);
    return () => clearTimeout(t);
  }, [p]);

  useEffect(() => {
    if (salvo !== "ok") return;
    estatisticasPortfolio().then(setStats).catch(() => {});
  }, [salvo]);

  useEffect(() => {
    listLeads()
      .then((l) => {
        setLeads(l);
        if (l[0]) setLeadEmail(l[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const idt = <K extends keyof Portfolio["identidade"]>(k: K, v: Portfolio["identidade"][K]) => setP((s) => ({ ...s, identidade: { ...s.identidade, [k]: v } }));
  const sob = <K extends keyof Portfolio["sobre"]>(k: K, v: Portfolio["sobre"][K]) => setP((s) => ({ ...s, sobre: { ...s.sobre, [k]: v } }));

  // ---------- importação ----------
  async function importar(lista: FileList | File[]) {
    const arr = Array.from(lista);
    if (!arr.length) return;
    setEnviando(true);
    const feitos: string[] = [];
    try {
      for (const f of arr) {
        const nome = f.name.toLowerCase();
        if (nome.endsWith(".csv") || f.type === "text/csv") {
          const r = interpretarCsv(lerCsv(await f.text()));
          setP((s) => ({ ...s, solucoes: [...s.solucoes, ...r.solucoes], cases: [...s.cases, ...r.cases], clientes: [...s.clientes, ...r.clientes] }));
          const partes = [r.solucoes.length && `${r.solucoes.length} soluções`, r.cases.length && `${r.cases.length} cases`, r.clientes.length && `${r.clientes.length} clientes`].filter(Boolean);
          feitos.push(partes.length ? `${f.name}: ${partes.join(", ")}` : `${f.name}: nenhuma coluna reconhecida`);
          if (r.solucoes.length) setAba("solucoes");
        } else if (f.type.startsWith("image/")) {
          const url = await reduzirImagem(f);
          if (!p.identidade.logo) {
            idt("logo", url);
            feitos.push(`${f.name}: virou o logo`);
          } else if (!p.identidade.foto) {
            idt("foto", url);
            feitos.push(`${f.name}: virou a foto do "Sobre"`);
          } else {
            const fd = new FormData();
            fd.set("arquivo", f);
            const a = await enviarArquivo(fd);
            setArquivos((s) => [a, ...s]);
            feitos.push(`${f.name}: guardado nos materiais`);
          }
        } else {
          const fd = new FormData();
          fd.set("arquivo", f);
          const a = await enviarArquivo(fd);
          setArquivos((s) => [a, ...s]);
          feitos.push(`${f.name}: guardado nos materiais`);
        }
      }
      setAviso({ tipo: "ok", texto: feitos.join(" · ") });
    } catch (e) {
      setAviso({ tipo: "erro", texto: e instanceof Error ? e.message : "Não foi possível importar." });
    } finally {
      setEnviando(false);
    }
  }

  async function baixar(a: ArquivoResumo) {
    const { nome, dados } = await baixarArquivo(a.id);
    const link = document.createElement("a");
    link.href = dados;
    link.download = nome;
    link.click();
  }

  // ---------- e-mail ----------
  const lead = leads.find((l) => l.id === leadEmail);
  // link do portfólio com o lead marcado (registra a visita no histórico dele)
  const link = stats?.id && p.compartilhar?.ativo && typeof window !== "undefined" ? `${window.location.origin}/p/${stats.id}${lead ? `?l=${lead.id}` : ""}` : "";
  const assunto = useMemo(() => preencherEmail(p.email.assunto.replaceAll("{link_portfolio}", link), p, lead), [p, lead, link]);
  const corpo = useMemo(() => preencherEmail(p.email.corpo.replaceAll("{link_portfolio}", link), p, lead), [p, lead, link]);

  const ABAS: { v: Aba; t: string; d: string; icon: typeof Mail }[] = [
    { v: "portfolio", t: "Crie seu portfólio", d: "Identidade, sobre você, cases e clientes", icon: Palette },
    { v: "solucoes", t: "Ofereça suas soluções para empresas", d: "Serviços, preços e e-mail de apresentação", icon: Rocket },
  ];

  return (
    <div className="space-y-4">
      {/* ---------- abas grandes ---------- */}
      <div role="tablist" aria-label="Portfólio" className="grid gap-3 md:grid-cols-2">
        {ABAS.map(({ v, t, d, icon: Icon }) => {
          const on = aba === v;
          return (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setAba(v)}
              className={`group relative flex min-h-28 cursor-pointer items-center gap-5 overflow-hidden rounded-[26px] border p-5 text-left transition-all duration-300 md:p-6 ${
                on ? "border-night bg-night text-white shadow-[0_24px_50px_-24px_color-mix(in_srgb,var(--color-night)_70%,transparent)]" : "border-white/80 bg-white/70 hover:-translate-y-0.5 hover:bg-white"
              }`}
            >
              {on && <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full opacity-60 blur-2xl" style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--color-neon) 55%, transparent), transparent 70%)" }} />}
              <span className={`relative flex size-14 shrink-0 items-center justify-center rounded-2xl ${on ? "bg-neon text-night" : "bg-night/5 group-hover:bg-night group-hover:text-neon"}`}>
                <Icon size={24} aria-hidden />
              </span>
              <span className="relative">
                <span className="block text-xl font-medium leading-tight tracking-[-0.02em] md:text-2xl">{t}</span>
                <span className={`mt-1 block text-sm ${on ? "text-white/60" : "opacity-55"}`}>{d}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ---------- importar arquivos ---------- */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          void importar(e.dataTransfer.files);
        }}
        className={`flex flex-wrap items-center gap-4 rounded-[26px] border-2 border-dashed px-5 py-4 transition-colors ${arrastando ? "border-night bg-neon/30" : "border-night/15 bg-white/50"}`}
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-night text-neon">{enviando ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} aria-hidden />}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Importe seus arquivos</p>
          <p className="text-sm opacity-60">
            Arraste aqui ou escolha: <b>CSV</b> vira soluções, cases ou clientes · <b>imagem</b> vira logo/foto · <b>PDF</b> fica nos materiais (até 3 MB).
          </p>
        </div>
        <input ref={inputArquivo} type="file" multiple accept=".pdf,.csv,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files && void importar(e.target.files)} />
        <button type="button" onClick={() => inputArquivo.current?.click()} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-night px-5 text-sm font-medium text-white hover:bg-neon hover:text-night">
          <Plus size={15} aria-hidden /> Escolher arquivos
        </button>
        {aviso && (
          <p role="status" className={`w-full rounded-2xl px-4 py-2.5 text-sm ${aviso.tipo === "ok" ? "bg-neon/40" : "bg-danger-100 text-danger-900"}`}>
            {aviso.texto}
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
        {/* ================= Editor ================= */}
        <div className="space-y-4">
          {aba === "portfolio" && (
            <>
              <Secao titulo="Sua identidade" icone={UserRound}>
                <div className="flex flex-wrap items-center gap-4">
                  {(["logo", "foto"] as const).map((k) => (
                    <label key={k} className="group relative flex size-20 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-dashed border-night/25 bg-white hover:border-night" title={k === "logo" ? "Logo" : "Foto"}>
                      {p.identidade[k] ? <img src={p.identidade[k]!} alt="" className="size-full object-cover" /> : <ImagePlus size={20} className="opacity-40" aria-hidden />}
                      <span className="absolute inset-x-0 bottom-0 bg-night/70 py-0.5 text-center text-[10px] text-white">{k === "logo" ? "Logo" : "Foto"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (f) idt(k, await reduzirImagem(f));
                        }}
                      />
                    </label>
                  ))}
                  <div>
                    <p className="text-sm font-medium">Cor da marca</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {CORES.map((c) => (
                        <button key={c} type="button" aria-label={`Cor ${c}`} onClick={() => idt("cor", c)} className={`size-7 cursor-pointer rounded-full ring-offset-2 ${p.identidade.cor === c ? "ring-2 ring-night" : ""}`} style={{ background: c }} />
                      ))}
                      <input type="color" value={p.identidade.cor} onChange={(e) => idt("cor", e.target.value)} className="size-7 cursor-pointer rounded-full border-0 bg-transparent" aria-label="Outra cor" />
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo rotulo="Seu nome" valor={p.identidade.nome} onChange={(v) => idt("nome", v)} />
                  <Campo rotulo="Cargo" valor={p.identidade.cargo} onChange={(v) => idt("cargo", v)} />
                  <Campo rotulo="Empresa" valor={p.identidade.empresa} onChange={(v) => idt("empresa", v)} />
                  <Campo rotulo="Cidade" valor={p.identidade.cidade} onChange={(v) => idt("cidade", v)} />
                </div>
                <Campo rotulo="Frase de impacto" valor={p.identidade.tagline} onChange={(v) => idt("tagline", v)} max={90} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo rotulo="E-mail" valor={p.identidade.email} onChange={(v) => idt("email", v)} />
                  <Campo rotulo="Telefone / WhatsApp" valor={p.identidade.telefone} onChange={(v) => idt("telefone", v)} />
                  <Campo rotulo="Site" valor={p.identidade.site} onChange={(v) => idt("site", v)} />
                  <Campo rotulo="LinkedIn" valor={p.identidade.linkedin} onChange={(v) => idt("linkedin", v)} placeholder="linkedin.com/in/…" />
                </div>
              </Secao>

              <Secao titulo="Sobre você" icone={Presentation}>
                <Area rotulo="Descrição" valor={p.sobre.texto} onChange={(v) => sob("texto", v)} linhas={5} max={700} />
                <Etiquetas rotulo="Especialidades" itens={p.sobre.especialidades} onChange={(v) => sob("especialidades", v)} placeholder="Digite e aperte Enter" />
                <div>
                  <p className="text-sm font-medium">Números que impressionam</p>
                  <div className="mt-1.5 space-y-2">
                    {p.sobre.numeros.map((n, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={n.valor} maxLength={14} onChange={(e) => sob("numeros", p.sobre.numeros.map((x, j) => (j === i ? { ...x, valor: e.target.value } : x)))} className={`${estiloCampo} !mt-0 w-32 font-medium`} placeholder="+120" />
                        <input value={n.rotulo} maxLength={60} onChange={(e) => sob("numeros", p.sobre.numeros.map((x, j) => (j === i ? { ...x, rotulo: e.target.value } : x)))} className={`${estiloCampo} !mt-0 flex-1`} placeholder="clientes atendidos" />
                        <button type="button" aria-label="Remover número" onClick={() => sob("numeros", p.sobre.numeros.filter((_, j) => j !== i))} className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-night/10">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                    {p.sobre.numeros.length < 5 && (
                      <button type="button" onClick={() => sob("numeros", [...p.sobre.numeros, { valor: "", rotulo: "" }])} className="flex cursor-pointer items-center gap-1.5 text-sm underline underline-offset-4">
                        <Plus size={14} /> Adicionar número
                      </button>
                    )}
                  </div>
                </div>
              </Secao>

              <Secao titulo="Cases de sucesso" icone={Check}>
                {p.cases.map((c, i) => (
                  <div key={c.id} className="space-y-2 rounded-2xl border border-night/10 bg-white/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">Case {String(i + 1).padStart(2, "0")}</span>
                      <button type="button" aria-label="Remover case" onClick={() => setP((s) => ({ ...s, cases: s.cases.filter((x) => x.id !== c.id) }))} className="cursor-pointer opacity-50 hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    {(
                      [
                        ["cliente", "Cliente"],
                        ["resultado", "Resultado (ex.: -27% no custo)"],
                        ["depoimento", "Depoimento"],
                        ["autor", "Quem disse"],
                      ] as const
                    ).map(([k, r]) => (
                      <input key={k} value={c[k]} placeholder={r} maxLength={k === "depoimento" ? 240 : 100} onChange={(e) => setP((s) => ({ ...s, cases: s.cases.map((x) => (x.id === c.id ? { ...x, [k]: e.target.value } : x)) }))} className={`${estiloCampo} !mt-0`} />
                    ))}
                  </div>
                ))}
                <button type="button" onClick={() => setP((s) => ({ ...s, cases: [...s.cases, { id: novoId(), cliente: "", resultado: "", depoimento: "", autor: "" }] }))} className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-night/15 bg-white px-4 text-sm hover:bg-night hover:text-white">
                  <Plus size={14} /> Adicionar case
                </button>
                <Etiquetas rotulo="Clientes que confiam em você" itens={p.clientes} onChange={(v) => setP((s) => ({ ...s, clientes: v }))} placeholder="Nome do cliente + Enter" />
              </Secao>
            </>
          )}

          {aba === "solucoes" && (
            <>
              <Secao titulo="Suas soluções" icone={Rocket}>
                {p.solucoes.map((s, i) => (
                  <div key={s.id} className="space-y-2 rounded-2xl border border-night/10 bg-white/60 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-widest opacity-50">Parte {String(i + 1).padStart(2, "0")}</span>
                      <button type="button" aria-label="Remover solução" onClick={() => setP((x) => ({ ...x, solucoes: x.solucoes.filter((y) => y.id !== s.id) }))} className="cursor-pointer opacity-50 hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <input value={s.titulo} placeholder="Nome da solução" maxLength={60} onChange={(e) => setP((x) => ({ ...x, solucoes: x.solucoes.map((y) => (y.id === s.id ? { ...y, titulo: e.target.value } : y)) }))} className={`${estiloCampo} !mt-0 font-medium`} />
                    <textarea value={s.descricao} placeholder="O que ela resolve, em uma frase" maxLength={200} rows={2} onChange={(e) => setP((x) => ({ ...x, solucoes: x.solucoes.map((y) => (y.id === s.id ? { ...y, descricao: e.target.value } : y)) }))} className={`${estiloCampo} !mt-0 py-2.5`} />
                    <input value={s.preco} placeholder="Investimento (ex.: a partir de R$ 2.900)" maxLength={50} onChange={(e) => setP((x) => ({ ...x, solucoes: x.solucoes.map((y) => (y.id === s.id ? { ...y, preco: e.target.value } : y)) }))} className={`${estiloCampo} !mt-0`} />
                  </div>
                ))}
                <button type="button" onClick={() => setP((x) => ({ ...x, solucoes: [...x.solucoes, { id: novoId(), titulo: "", descricao: "", preco: "" }] }))} className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border border-night/15 bg-white px-4 text-sm hover:bg-night hover:text-white">
                  <Plus size={14} /> Adicionar solução
                </button>
                <p className="text-xs opacity-60">
                  Dica: importe um CSV com as colunas <b>titulo; descricao; preco</b> para trazer várias de uma vez.
                </p>
              </Secao>

              <Secao titulo="E-mail de apresentação" icone={Mail}>
                <p className="text-sm opacity-60">Escreva uma vez: o Oraklo troca as variáveis pelos dados de cada lead.</p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIAVEIS.map((v) => (
                    <button key={v} type="button" onClick={() => setP((s) => ({ ...s, email: { ...s.email, corpo: `${s.email.corpo}${v}` } }))} className="cursor-pointer rounded-full bg-night/5 px-2.5 py-1 font-mono text-[11px] hover:bg-night hover:text-neon" title="Inserir no texto">
                      {v}
                    </button>
                  ))}
                </div>
                <Campo rotulo="Assunto" valor={p.email.assunto} onChange={(v) => setP((s) => ({ ...s, email: { ...s.email, assunto: v } }))} max={140} />
                <Area rotulo="Mensagem" valor={p.email.corpo} onChange={(v) => setP((s) => ({ ...s, email: { ...s.email, corpo: v } }))} linhas={9} />

                <div className="rounded-2xl bg-night p-4 text-white">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Micro className="!opacity-60">Prévia para</Micro>
                    <select value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} className="max-w-60 cursor-pointer rounded-full bg-white/10 px-3 py-1.5 text-xs">
                      {!leads.length && <option value="">Sem leads ainda (exemplo)</option>}
                      {leads.map((l) => (
                        <option key={l.id} value={l.id} className="text-night">
                          {l.name} · {l.company}
                        </option>
                      ))}
                    </select>
                  </div>
                  {lead && (
                    <p className="mt-3 flex items-center gap-2 text-xs text-white/60">
                      <span className="flex size-6 items-center justify-center rounded-full bg-neon font-mono text-[9px] text-night">{iniciais(lead.name)}</span>
                      {lead.email || "lead sem e-mail cadastrado"}
                    </p>
                  )}
                  <p className="mt-3 text-sm font-medium">{assunto}</p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/80">{corpo}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(`${assunto}\n\n${corpo}`);
                        setCopiado(true);
                        setTimeout(() => setCopiado(false), 1500);
                      }}
                      className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-4 text-xs font-medium hover:bg-white/20"
                    >
                      {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? "Copiado" : "Copiar texto"}
                    </button>
                    <a
                      href={`mailto:${lead?.email ?? ""}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`}
                      className="flex min-h-10 items-center gap-1.5 rounded-full bg-neon px-4 text-xs font-medium text-night"
                    >
                      <Mail size={13} /> Abrir no e-mail
                    </a>
                  </div>
                  <p className="mt-3 text-[11px] text-white/40">Dica: baixe o portfólio em PDF (ao lado) e anexe ao e-mail.</p>
                </div>
              </Secao>
            </>
          )}

          {/* materiais importados */}
          <Secao titulo="Materiais" icone={FileText}>
            {arquivos.length ? (
              <ul className="divide-y divide-night/10">
                {arquivos.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-night/5">
                      {a.tipo.includes("pdf") ? <FileText size={16} aria-hidden /> : a.tipo.includes("csv") ? <Sheet size={16} aria-hidden /> : <ImagePlus size={16} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{a.nome}</span>
                      <span className="block font-mono text-[10px] opacity-50">
                        {tamanho(a.tamanho)} · {new Date(a.criadoEm).toLocaleDateString("pt-BR")}
                      </span>
                    </span>
                    <button type="button" onClick={() => void baixar(a)} aria-label={`Baixar ${a.nome}`} className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-night hover:text-white">
                      <Download size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remover ${a.nome}`}
                      onClick={async () => {
                        if (!window.confirm(`Remover "${a.nome}"?`)) return;
                        await removerArquivo(a.id);
                        setArquivos((s) => s.filter((x) => x.id !== a.id));
                      }}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-danger-500 hover:text-white"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm opacity-60">Nenhum material ainda. PDFs importados (apresentações, catálogos, propostas) aparecem aqui para baixar e anexar.</p>
            )}
          </Secao>
        </div>

        {/* ================= Prévia ================= */}
        <div className="space-y-4 lg:sticky lg:top-24">
          {/* link público com contagem de visitas */}
          <div className={`overflow-hidden rounded-[24px] p-4 transition-colors ${p.compartilhar?.ativo ? "bg-night text-white" : "border border-white/80 bg-white/70"}`}>
            <div className="flex items-center gap-3">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${p.compartilhar?.ativo ? "bg-neon text-night" : "bg-night/5"}`}>
                <Link2 size={18} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-tight">Link público</p>
                <p className={`text-xs ${p.compartilhar?.ativo ? "text-white/55" : "opacity-55"}`}>Mande o portfólio por link e veja quem abriu</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <span className="sr-only">Ativar link público</span>
                <input type="checkbox" className="peer sr-only" checked={!!p.compartilhar?.ativo} onChange={(e) => setP((s) => ({ ...s, compartilhar: { ativo: e.target.checked } }))} />
                <span className="h-6 w-11 rounded-full bg-night/15 transition-colors peer-checked:bg-neon" />
                <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 peer-checked:bg-night" />
              </label>
            </div>
            {p.compartilhar?.ativo && (
              <div className="mt-4 space-y-3">
                {stats?.id ? (
                  <div className="flex gap-2">
                    <a href={`/p/${stats.id}`} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate rounded-full bg-white/10 px-4 py-2.5 font-mono text-[11px] text-neon hover:bg-white/15">
                      {typeof window !== "undefined" ? window.location.host : ""}/p/{stats.id}
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(`${window.location.origin}/p/${stats.id}`);
                        setLinkCopiado(true);
                        setTimeout(() => setLinkCopiado(false), 1800);
                      }}
                      className="flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-neon px-4 text-xs font-medium text-night"
                    >
                      {linkCopiado ? <Check size={13} /> : <Copy size={13} aria-hidden />} {linkCopiado ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-xs text-white/60">
                    <Loader2 size={12} className="animate-spin" /> Gerando link…
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-white/45">Visitas</p>
                    <p className="mt-1 flex items-center gap-2 text-2xl font-light tracking-[-0.04em]">
                      <Eye size={15} aria-hidden className="text-neon" /> {stats?.total ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/5 p-3">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-white/45">Últimos 7 dias</p>
                    <p className="mt-1 text-2xl font-light tracking-[-0.04em]">{stats?.semana ?? 0}</p>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-white/50">
                  Use <code className="font-mono text-neon">{"{link_portfolio}"}</code> no e-mail: cada lead recebe um link próprio e a visita aparece no histórico dele.
                </p>
              </div>
            )}
          </div>

          <Glass className="no-fx p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <Micro>Prévia do portfólio</Micro>
                <p className="mt-1 flex items-center gap-1.5 text-xs opacity-70">
                  {salvo === "salvando" ? <Loader2 size={12} className="animate-spin" /> : salvo === "ok" ? <Check size={12} className="text-good-600" /> : <X size={12} className="text-danger-600" />}
                  {salvo === "salvando" ? "Salvando…" : salvo === "ok" ? "Tudo salvo" : "Não foi possível salvar — tente de novo"}
                </p>
              </div>
              <button type="button" onClick={() => window.print()} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-night px-4 text-sm font-medium text-white hover:bg-neon hover:text-night">
                <Download size={15} aria-hidden /> Baixar PDF
              </button>
            </div>
            <div className="max-h-[78vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
              <Slides p={p} />
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}
