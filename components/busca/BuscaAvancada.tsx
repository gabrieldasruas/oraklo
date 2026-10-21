"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import { Glass, Micro } from "@/components/app/ui";
import ContactCell from "@/components/app/ContactCell";
import {
  cidadeMaisProxima,
  centroNoBrasil,
  ESTADOS,
  MUNICIPIOS,
  municipiosNoRaio,
  RAIO_MAX_KM,
  RAIO_MIN_KM,
  UFS,
  type Escopo,
} from "@/lib/geo/radius";
import { formatCnae, formatCnpj, formatMoney, SIZE_LABEL } from "@/lib/format";
import type { Centro } from "./RadiusMap";

// O Leaflet usa `window`: carrega só no navegador.
const RadiusMap = dynamic(() => import("./RadiusMap"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-white/40" />,
});

type Cnae = { code: string; description: string; count: number };
type Item = {
  cnpj: string;
  name: string;
  isHeadquarters: boolean;
  city: string;
  uf: string;
  size: string;
  shareCapital: number | null;
  email: string | null;
  phones: string[];
};
type Resultado = {
  items: Item[];
  nextCursor: string | null;
  total: number | null;
  municipios: number;
  ufs: string[];
  escopo: Escopo;
  centro: { name: string; uf: string };
};
type Override = { escopo?: Escopo; raioKm?: number; ufs?: string[]; centro?: Centro };

const INICIO: Centro = [-23.5505, -46.6333]; // São Paulo
const fmt = (n: number) => n.toLocaleString("pt-BR");

export default function BuscaAvancada({ cnaes }: { cnaes: Cnae[] }) {
  const [centro, setCentro] = useState<Centro>(INICIO);
  const [raioKm, setRaioKm] = useState(60);
  const [fitToken, setFitToken] = useState(1); // 1 = enquadra o círculo ao abrir
  const [aviso, setAviso] = useState<string | null>(null);

  const [ufsFiltro, setUfsFiltro] = useState<string[]>([]);
  const [cnaesSel, setCnaesSel] = useState<string[]>([]);
  const [busca, setBusca] = useState("");
  const [portes, setPortes] = useState<string[]>([]);
  const [temEmail, setTemEmail] = useState(false);
  const [matriz, setMatriz] = useState(false);

  const [res, setRes] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [escopo, setEscopo] = useState<Escopo>("raio");

  // Prévia ao vivo (no navegador): cidades e estados que entram na busca.
  const perto = useMemo(() => cidadeMaisProxima(centro[0], centro[1]).municipio, [centro]);
  const ufsDoEstado = ufsFiltro.length ? ufsFiltro : [perto.uf];
  const cidades = useMemo(() => {
    if (escopo === "cidade") return [perto];
    if (escopo === "estado") return MUNICIPIOS.filter((m) => ufsDoEstado.includes(m.uf));
    return municipiosNoRaio(centro[0], centro[1], raioKm, ufsFiltro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro, raioKm, ufsFiltro, escopo, perto]);
  const estados = useMemo(() => [...new Set(cidades.map((c) => c.uf))].sort(), [cidades]);
  const nomeEstado = (uf: string) => ESTADOS[uf]?.nome ?? uf;

  const rotuloBotao =
    escopo === "cidade"
      ? `Buscar em ${perto.name}`
      : escopo === "estado"
        ? `Buscar em todo ${ufsDoEstado.join(", ")}`
        : `Buscar no raio de ${raioKm} km`;

  const cnaesFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const list = q
      ? cnaes.filter((c) => c.description.toLowerCase().includes(q) || c.code.includes(q.replace(/\D/g, "") || "#"))
      : cnaes;
    return list.slice(0, 40);
  }, [busca, cnaes]);
  const nomeCnae = (code: string) => cnaes.find((c) => c.code === code)?.description ?? code;

  function mover(c: Centro, km: number) {
    // só aceita centros dentro do Brasil
    if (!centroNoBrasil(c[0], c[1])) {
      setAviso("A busca só funciona dentro do Brasil. Arraste o centro para um estado brasileiro.");
      return;
    }
    setAviso(null);
    setCentro(c);
    if (km !== raioKm) setEscopo("raio"); // mexeu nas bordas = quer buscar por raio
    setRaioKm(km);
  }

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  /** `o` permite buscar já com um novo alcance (usado pelas sugestões de ampliar). */
  async function buscar(cursor?: string, o: Override = {}) {
    const c = o.centro ?? centro;
    setCarregando(true);
    setErro(null);
    try {
      const r = await fetch("/api/busca-raio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: c[0],
          lng: c[1],
          raioKm: o.raioKm ?? raioKm,
          escopo: o.escopo ?? escopo,
          ufs: o.ufs ?? ufsFiltro,
          cnaes: cnaesSel,
          portes,
          temEmail,
          matriz,
          cursor,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Falha na busca");
      setRes((prev) => (cursor && prev ? { ...j, total: prev.total, items: [...prev.items, ...j.items] } : j));
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na busca");
    } finally {
      setCarregando(false);
    }
  }

  // Sugestões de alcance: ampliar o raio, ir para o estado inteiro ou trocar de estado.
  function ampliarRaio(km: number) {
    setEscopo("raio");
    setUfsFiltro([]);
    setRaioKm(km);
    setFitToken((t) => t + 1);
    void buscar(undefined, { escopo: "raio", raioKm: km, ufs: [] });
  }
  function todoEstado(uf: string) {
    setEscopo("estado");
    setUfsFiltro([uf]);
    void buscar(undefined, { escopo: "estado", ufs: [uf] });
  }
  function outroEstado(uf: string) {
    const e = ESTADOS[uf];
    if (!e) return;
    // leva o mapa para o estado e busca nele inteiro
    const c: Centro = [e.lat, e.lng];
    setCentro(c);
    setRaioKm(Math.min(RAIO_MAX_KM, 300));
    setFitToken((t) => t + 1);
    setEscopo("estado");
    setUfsFiltro([uf]);
    void buscar(undefined, { escopo: "estado", ufs: [uf], centro: c });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1fr_380px] xl:items-start">
        {/* Mapa */}
        <Glass className="no-fx relative overflow-hidden">
          <div className="relative isolate h-[460px] md:h-[600px]">
            <RadiusMap
              centro={centro}
              raioKm={raioKm}
              cidades={cidades.slice(0, 400)}
              fitToken={fitToken}
              circuloAtivo={escopo === "raio"}
              onChange={mover}
            />

            {/* resumo flutuante sobre o mapa */}
            <div className="pointer-events-none absolute left-4 top-4 z-[500] flex flex-wrap gap-2">
              <span className="rounded-full bg-night px-4 py-2 font-mono text-xs text-neon shadow-lg">
                {escopo === "cidade" ? `Só ${perto.name}` : escopo === "estado" ? `Todo ${ufsDoEstado.join(", ")}` : `${raioKm} km de raio`}
              </span>
              <span className="rounded-full bg-white/90 px-4 py-2 text-xs shadow-lg backdrop-blur">
                <b className="font-medium">{fmt(cidades.length)}</b> municípios · {estados.join(", ") || "—"}
              </span>
            </div>
            <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs shadow-lg backdrop-blur">
              <Crosshair size={13} aria-hidden /> Centro perto de <b className="font-medium">{perto.name}/{perto.uf}</b>
            </div>
            {aviso && (
              <div role="alert" className="absolute inset-x-4 top-16 z-[600] flex items-start justify-between gap-3 rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-900 shadow-lg">
                {aviso}
                <button type="button" aria-label="Fechar aviso" onClick={() => setAviso(null)} className="cursor-pointer">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-night/10 px-5 py-4">
            <label className="flex flex-1 items-center gap-4 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">Raio</span>
              <input
                type="range"
                min={RAIO_MIN_KM}
                max={RAIO_MAX_KM}
                step={5}
                value={raioKm}
                onChange={(e) => {
                  setRaioKm(Number(e.target.value));
                  setEscopo("raio");
                }}
                onPointerUp={() => setFitToken((t) => t + 1)}
                onKeyUp={() => setFitToken((t) => t + 1)}
                className="h-2 flex-1 cursor-pointer accent-night"
              />
              <span className="w-16 text-right font-mono tabular-nums">{raioKm} km</span>
            </label>
            <Micro>Arraste o centro ou as bordas · clique no mapa para mover</Micro>
          </div>

          {/* Sugestão de alcance: para quem não quer pensar em km */}
          <div className="flex flex-wrap items-center gap-2 border-t border-night/10 bg-white/40 px-5 py-4">
            <p className="mr-2 text-sm">
              <span className="font-medium">Quer ampliar?</span>{" "}
              <span className="opacity-60">
                Buscar empresas a mais km de {perto.name}, em todo {perto.uf} ou em outro estado?
              </span>
            </p>
            {[10, 25, 50, 100, 200, 400]
              .filter((km) => escopo !== "raio" || km > raioKm)
              .slice(0, 3)
              .map((km) => (
                <button
                  key={km}
                  type="button"
                  onClick={() => ampliarRaio(km)}
                  className="min-h-9 cursor-pointer rounded-full border border-night/15 bg-white px-4 text-xs font-medium hover:bg-night hover:text-white"
                >
                  {km} km de {perto.name}
                </button>
              ))}
            <button
              type="button"
              onClick={() => todoEstado(perto.uf)}
              className="min-h-9 cursor-pointer rounded-full bg-night px-4 text-xs font-medium text-white hover:bg-neon hover:text-night"
            >
              Todo {perto.uf}
            </button>
            <label className="relative">
              <span className="sr-only">Buscar em outro estado</span>
              <select
                value=""
                onChange={(e) => e.target.value && outroEstado(e.target.value)}
                className="min-h-9 cursor-pointer appearance-none rounded-full border border-night/15 bg-white py-1 pl-4 pr-8 text-xs font-medium hover:border-night/40"
              >
                <option value="">Outro estado…</option>
                {UFS.filter((u) => u !== perto.uf).map((u) => (
                  <option key={u} value={u}>
                    {u} · {nomeEstado(u)}
                  </option>
                ))}
              </select>
              <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] opacity-60">
                ▼
              </span>
            </label>
          </div>
        </Glass>

        {/* Filtros */}
        <aside className="aura-night no-fx space-y-6 rounded-[28px] p-6 text-white xl:sticky xl:top-4">
          {/* Onde buscar */}
          <div>
            <Micro className="!opacity-60">Onde buscar</Micro>
            <div role="radiogroup" aria-label="Alcance da busca" className="mt-3 grid grid-cols-3 gap-2">
              {(
                [
                  { v: "raio", t: "No raio", d: `${raioKm} km` },
                  { v: "cidade", t: "Na cidade", d: `${perto.name}/${perto.uf}` },
                  { v: "estado", t: "No estado", d: `Todo ${ufsDoEstado.join(", ")}` },
                ] as { v: Escopo; t: string; d: string }[]
              ).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  role="radio"
                  aria-checked={escopo === o.v}
                  onClick={() => setEscopo(o.v)}
                  className={`min-h-16 cursor-pointer rounded-2xl border px-3 py-2 text-left transition-colors ${
                    escopo === o.v ? "border-neon bg-neon text-night" : "border-white/15 hover:bg-white/10"
                  }`}
                >
                  <span className="block text-sm font-medium">{o.t}</span>
                  <span className={`block truncate text-[11px] ${escopo === o.v ? "opacity-70" : "text-white/50"}`}>{o.d}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Micro className="!opacity-60">Atividade (CNAE)</Micro>
            <label className="relative mt-3 block">
              <span className="sr-only">Buscar CNAE</span>
              <Search size={15} aria-hidden className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Ex.: transporte, 4930-2/02"
                className="min-h-11 w-full rounded-full border border-white/15 bg-white/10 pl-10 pr-4 text-sm placeholder:text-white/40 focus:border-neon focus:outline-none"
              />
            </label>
            {cnaesSel.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {cnaesSel.map((c) => (
                  <li key={c}>
                    <button
                      type="button"
                      onClick={() => setCnaesSel((s) => s.filter((x) => x !== c))}
                      className="flex max-w-[20rem] cursor-pointer items-center gap-2 rounded-full bg-neon py-1.5 pl-3 pr-2 text-left text-xs text-night"
                      title="Remover"
                    >
                      <span className="truncate">{formatCnae(c)} · {nomeCnae(c)}</span>
                      <X size={12} aria-hidden className="shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-3 max-h-52 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {cnaesFiltrados.map((c) => {
                const on = cnaesSel.includes(c.code);
                return (
                  <li key={c.code}>
                    <button
                      type="button"
                      onClick={() => setCnaesSel((s) => toggle(s, c.code))}
                      aria-pressed={on}
                      className={`flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2 text-left text-xs transition-colors ${on ? "bg-white/15" : "hover:bg-white/10"}`}
                    >
                      <span className={`mt-0.5 size-3 shrink-0 rounded-full border ${on ? "border-neon bg-neon" : "border-white/40"}`} />
                      <span>
                        <span className="font-mono text-white/50">{formatCnae(c.code)}</span> {c.description}
                        <span className="ml-1 text-white/40">({fmt(c.count)})</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {!cnaesFiltrados.length && <li className="px-3 py-2 text-xs text-white/50">Nenhuma atividade encontrada.</li>}
            </ul>
          </div>

          <div>
            <Micro className="!opacity-60">Limitar a estados (opcional)</Micro>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {UFS.map((u) => {
                const on = ufsFiltro.includes(u);
                const dentro = estados.includes(u) || on;
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUfsFiltro((s) => toggle(s, u))}
                    aria-pressed={on}
                    className={`min-h-8 min-w-10 cursor-pointer rounded-full border px-2 font-mono text-[11px] transition-colors ${
                      on ? "border-neon bg-neon text-night" : dentro ? "border-white/40 text-white" : "border-white/10 text-white/35 hover:text-white/70"
                    }`}
                  >
                    {u}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Micro className="!opacity-60">Porte</Micro>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["ME", "EPP", "DEMAIS"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPortes((s) => toggle(s, p))}
                  aria-pressed={portes.includes(p)}
                  className={`min-h-10 cursor-pointer rounded-full border px-4 text-xs ${portes.includes(p) ? "border-neon bg-neon text-night" : "border-white/20 hover:bg-white/10"}`}
                >
                  {SIZE_LABEL[p]}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={temEmail} onChange={(e) => setTemEmail(e.target.checked)} className="size-4 accent-[#b8ff3c]" />
                Só com e-mail
              </label>
              <label className="flex cursor-pointer items-center gap-3">
                <input type="checkbox" checked={matriz} onChange={(e) => setMatriz(e.target.checked)} className="size-4 accent-[#b8ff3c]" />
                Só matrizes
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => buscar()}
            disabled={carregando}
            className="group flex min-h-14 w-full cursor-pointer items-center justify-between rounded-full bg-neon py-2 pl-6 pr-2 text-base font-medium text-night transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
          >
            <span className="truncate">{rotuloBotao}</span>
            <span className="flex size-10 items-center justify-center rounded-full bg-night text-neon">
              {carregando ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
            </span>
          </button>
          <p className="text-[11px] leading-relaxed text-white/45">
            O raio considera a sede do município de cada empresa (dados da Receita Federal). Só é possível buscar dentro do Brasil.
          </p>
        </aside>
      </div>

      {/* Resultados */}
      {erro && (
        <p role="alert" className="rounded-2xl bg-rose-100 px-5 py-3 text-sm text-rose-900">
          {erro}
        </p>
      )}
      {res && (
        <Glass className="overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-2 p-5">
            <p className="text-4xl font-light tracking-[-0.05em] tabular-nums">
              {fmt(res.total ?? 0)}{" "}
              <span className="text-base tracking-normal opacity-60">
                {res.escopo === "cidade"
                  ? `empresas em ${res.centro.name}/${res.centro.uf}`
                  : res.escopo === "estado"
                    ? `empresas em todo ${res.ufs.join(", ")}`
                    : "empresas no raio"}
              </span>
            </p>
            <Micro>
              {fmt(res.municipios)} municípios · {res.ufs.join(", ")}
            </Micro>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <caption className="sr-only">Empresas dentro do raio</caption>
              <thead>
                <tr className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
                  <th scope="col" className="px-6 py-4 font-normal">Empresa</th>
                  <th scope="col" className="px-4 py-4 font-normal">Local</th>
                  <th scope="col" className="px-4 py-4 font-normal">Porte</th>
                  <th scope="col" className="px-4 py-4 text-right font-normal">Capital</th>
                  <th scope="col" className="px-4 py-4 font-normal">Contato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-night/10 border-t border-night/10">
                {res.items.map((c) => (
                  <tr key={c.cnpj} className="transition-colors hover:bg-white/60">
                    <td className="px-6 py-4">
                      <Link href={`/empresas/${c.cnpj}`} className="block font-medium tracking-[-0.01em] underline-offset-4 hover:underline">
                        {c.name}
                      </Link>
                      <span className="block font-mono text-[11px] opacity-55">
                        {formatCnpj(c.cnpj)}
                        {!c.isHeadquarters && " · filial"}
                      </span>
                    </td>
                    <td className="px-4 py-4 opacity-70">{[c.city, c.uf].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-4 opacity-70">{SIZE_LABEL[c.size] ?? "—"}</td>
                    <td className="px-4 py-4 text-right font-mono text-xs tabular-nums">{formatMoney(c.shareCapital)}</td>
                    <td className="px-4 py-3">
                      <ContactCell email={c.email} phones={c.phones} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!res.items.length && (
            <p className="px-5 py-14 text-center text-sm opacity-60">
              Nenhuma empresa nesse raio com esses filtros. Aumente o raio ou mude a atividade.
            </p>
          )}
          {res.nextCursor && (
            <div className="flex justify-center border-t border-night/10 p-4">
              <button
                type="button"
                onClick={() => buscar(res.nextCursor ?? undefined)}
                disabled={carregando}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-night px-6 text-sm font-medium text-white disabled:opacity-60"
              >
                {carregando && <Loader2 size={14} className="animate-spin" />} Carregar mais 50
              </button>
            </div>
          )}
        </Glass>
      )}
    </div>
  );
}
