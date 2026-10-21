"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Building2, Check, ChevronDown, Crosshair, Loader2, Locate, MapPin, Radio, Search, X } from "lucide-react";
import { Glass, Micro } from "@/components/app/ui";
import ContactCell from "@/components/app/ContactCell";
import {
  cidadeMaisProxima,
  centroNoBrasil,
  distanciaKm,
  ESTADOS,
  MUNICIPIOS,
  municipiosNoRaio,
  RAIO_MAX_KM,
  RAIO_MIN_KM,
  UFS,
  type Escopo,
} from "@/lib/geo/radius";
import { formatCnae, formatCnpj, formatMoney, SIZE_LABEL } from "@/lib/format";
import type { Centro, EmpresaNoMapa, ModoMapa } from "./RadiusMap";

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
  zip: string | null;
  address: string | null;
  district: string | null;
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

/** Fração das empresas localizadas (as de maior capital) que ganham pin neon; as demais, marcação leve. */
const FRACAO_DESTAQUE = 0.6;
/** Espera depois da última mudança antes de atualizar a lista (ms). */
const ESPERA_AO_VIVO = 600;

const INICIO: Centro = [-23.5505, -46.6333]; // São Paulo
const fmt = (n: number) => n.toLocaleString("pt-BR");
const semAcento = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export default function BuscaAvancada({
  cnaes,
  ufsComDados = {},
}: {
  cnaes: Cnae[];
  /** UF → empresas já importadas na base */
  ufsComDados?: Record<string, number>;
}) {
  // ---------- círculo e alcance ----------
  const [centro, setCentro] = useState<Centro>(INICIO);
  const [raioKm, setRaioKm] = useState(60);
  const [escopo, setEscopo] = useState<Escopo>("raio");
  const [fitToken, setFitToken] = useState(1); // 1 = enquadra o círculo ao abrir
  const [aviso, setAviso] = useState<string | null>(null);
  const [modoMapa, setModoMapa] = useState<ModoMapa>("auto");
  const [voar, setVoar] = useState<{ lat: number; lng: number; token: number } | null>(null);

  // ---------- filtros ----------
  const [ufsFiltro, setUfsFiltro] = useState<string[]>([]);
  const [cnaesSel, setCnaesSel] = useState<string[]>([]);
  const [buscaCnae, setBuscaCnae] = useState("");
  const [portes, setPortes] = useState<string[]>([]);
  const [temEmail, setTemEmail] = useState(false);
  const [matriz, setMatriz] = useState(false);
  const [aberto, setAberto] = useState<null | "cnae" | "estados" | "cidade" | "cidade-barra">(null);

  // ---------- resultados ----------
  const [res, setRes] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const pedidoAtual = useRef(0);

  // ---------- empresas no mapa (CEP → coordenada) ----------
  const [coords, setCoords] = useState<Record<string, { lat: number; lng: number }>>({});
  const [localizando, setLocalizando] = useState(false);
  const [foco, setFoco] = useState<string | null>(null);
  const pedidosCep = useRef(new Set<string>());

  // ---------- seletor de cidade ----------
  const [ufCidade, setUfCidade] = useState<string | null>(null);
  const [buscaCidade, setBuscaCidade] = useState("");

  // ====== derivados ======
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
  const semDados = (uf: string) => !ufsComDados[uf];
  const estadosComDados = Object.entries(ufsComDados)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  const ufLista = ufCidade ?? perto.uf;
  const opcoesCidade = useMemo(() => {
    const q = semAcento(buscaCidade.trim());
    const daUf = MUNICIPIOS.filter((m) => m.uf === ufLista);
    const filtradas = q ? daUf.filter((m) => semAcento(m.name).includes(q)) : daUf;
    return filtradas.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")).slice(0, 40);
  }, [buscaCidade, ufLista]);

  const cnaesFiltrados = useMemo(() => {
    const q = semAcento(buscaCnae.trim());
    const digitos = q.replace(/\D/g, "");
    const list = q ? cnaes.filter((c) => semAcento(c.description).includes(q) || (digitos && c.code.includes(digitos))) : cnaes;
    return list.slice(0, 50);
  }, [buscaCnae, cnaes]);
  const nomeCnae = (code: string) => cnaes.find((c) => c.code === code)?.description ?? code;

  const alcanceTexto =
    escopo === "cidade" ? `${perto.name}/${perto.uf}` : escopo === "estado" ? `todo ${ufsDoEstado.join(", ")}` : `${raioKm} km de ${perto.name}`;

  // ====== ações ======
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

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

  function escolherCidade(code: string) {
    const m = MUNICIPIOS.find((x) => x.code === code);
    if (!m) return;
    setCentro([m.lat, m.lng]);
    setEscopo("cidade");
    setRaioKm((r) => Math.min(r, 25));
    setFitToken((t) => t + 1);
    setBuscaCidade("");
    setAberto(null);
    setAviso(null);
  }

  // Leva o círculo até o estado, com raio suficiente para cobrir o estado inteiro.
  function irParaEstado(uf: string) {
    const e = ESTADOS[uf];
    if (!e) return;
    const longe = MUNICIPIOS.filter((m) => m.uf === uf).reduce((mx, m) => Math.max(mx, distanciaKm(e.lat, e.lng, m.lat, m.lng)), 0);
    setCentro([e.lat, e.lng]);
    setRaioKm(Math.min(RAIO_MAX_KM, Math.max(RAIO_MIN_KM, Math.ceil(longe / 5) * 5)));
    setFitToken((t) => t + 1);
    setAviso(null);
  }

  /** Busca (ou próxima página com `cursor`). Respostas antigas são descartadas. */
  async function buscar(cursor?: string, o: Override = {}) {
    const c = o.centro ?? centro;
    const id = ++pedidoAtual.current;
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
      if (id !== pedidoAtual.current) return; // chegou uma busca mais nova
      if (!r.ok) throw new Error(j.error ?? "Falha na busca");
      setRes((prev) => (cursor && prev ? { ...j, total: prev.total, items: [...prev.items, ...j.items] } : j));
    } catch (e) {
      if (id === pedidoAtual.current) setErro(e instanceof Error ? e.message : "Falha na busca");
    } finally {
      if (id === pedidoAtual.current) setCarregando(false);
    }
  }

  // Lista ao vivo: qualquer mudança no círculo ou nos filtros atualiza os resultados.
  useEffect(() => {
    const t = setTimeout(() => void buscar(), ESPERA_AO_VIVO);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro, raioKm, escopo, ufsFiltro, cnaesSel, portes, temEmail, matriz]);

  // Sugestões de alcance.
  function ampliarRaio(km: number) {
    setEscopo("raio");
    setUfsFiltro([]);
    setRaioKm(km);
    setFitToken((t) => t + 1);
  }
  function outroEstado(uf: string) {
    irParaEstado(uf);
    setEscopo("estado");
    setUfsFiltro([uf]);
  }

  // Assim que chegam resultados, localiza pelo CEP as empresas que ainda não têm coordenada.
  useEffect(() => {
    const faltando = (res?.items ?? [])
      .map((i) => i.zip)
      .filter((z): z is string => !!z && !coords[z] && !pedidosCep.current.has(z));
    if (!faltando.length) return;
    faltando.forEach((z) => pedidosCep.current.add(z));
    setLocalizando(true);
    fetch("/api/geo-cep", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ceps: faltando.slice(0, 60) }) })
      .then((r) => (r.ok ? r.json() : { coords: {} }))
      .then((j) => setCoords((c) => ({ ...c, ...(j.coords ?? {}) })))
      .catch(() => {})
      .finally(() => setLocalizando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res?.items]);

  // Empresas localizadas → pins. As de maior capital (resultado já vem ordenado) ganham destaque.
  const empresasNoMapa: EmpresaNoMapa[] = useMemo(() => {
    const localizadas = (res?.items ?? []).filter((i) => i.zip && coords[i.zip]);
    const corte = Math.max(1, Math.ceil(localizadas.length * FRACAO_DESTAQUE));
    return localizadas.map((i, idx) => {
      const c = coords[i.zip!];
      return {
        cnpj: i.cnpj,
        name: i.name,
        lat: c.lat,
        lng: c.lng,
        destaque: idx < corte,
        local: [i.address, i.district, i.city && `${i.city}/${i.uf}`].filter(Boolean).join(" · "),
        capital: i.shareCapital,
      };
    });
  }, [res?.items, coords]);
  const noMapa = new Map(empresasNoMapa.map((e) => [e.cnpj, e]));

  // ====== UI ======
  const chip = (on: boolean) =>
    `min-h-10 cursor-pointer rounded-full border px-4 text-xs font-medium transition-colors ${
      on ? "border-night bg-night text-white" : "border-night/15 bg-white/70 hover:border-night/40"
    }`;

  const seletorCidade = (onEscolher: (code: string) => void) => (
    <div className="w-80 rounded-2xl border border-night/10 bg-white p-3 shadow-2xl">
      <div className="flex gap-2">
        <label className="relative">
          <span className="sr-only">Estado</span>
          <select
            value={ufLista}
            onChange={(e) => {
              setUfCidade(e.target.value);
              setBuscaCidade("");
            }}
            className="min-h-10 cursor-pointer appearance-none rounded-full border border-night/15 bg-white py-1 pl-3 pr-7 font-mono text-xs"
          >
            {UFS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <ChevronDown size={12} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60" />
        </label>
        <label className="relative flex-1">
          <span className="sr-only">Cidade</span>
          <Search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
          <input
            autoFocus
            value={buscaCidade}
            onChange={(e) => setBuscaCidade(e.target.value)}
            placeholder={`Cidade em ${nomeEstado(ufLista)}`}
            className="min-h-10 w-full rounded-full border border-night/15 bg-white pl-8 pr-3 text-xs focus:border-night focus:outline-none"
          />
        </label>
      </div>
      <ul className="mt-2 max-h-56 space-y-0.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {opcoesCidade.map((m) => (
          <li key={m.code}>
            <button
              type="button"
              onClick={() => onEscolher(m.code)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs ${
                m.code === perto.code && escopo === "cidade" ? "bg-neon" : "hover:bg-night hover:text-white"
              }`}
            >
              {m.name}
              <span className="font-mono text-[10px] opacity-50">{m.uf}</span>
            </button>
          </li>
        ))}
        {!opcoesCidade.length && <li className="px-3 py-1.5 text-xs opacity-50">Nenhuma cidade encontrada.</li>}
      </ul>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ================= Barra de filtros ================= */}
      <Glass className="no-fx relative z-30 p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Onde buscar */}
          <div role="radiogroup" aria-label="Onde buscar" className="flex rounded-full bg-night/5 p-1">
            {(
              [
                { v: "raio", t: "No raio", d: `${raioKm} km` },
                { v: "cidade", t: "Na cidade", d: perto.name },
                { v: "estado", t: "No estado", d: ufsDoEstado.join(", ") },
              ] as { v: Escopo; t: string; d: string }[]
            ).map((o) => (
              <div key={o.v} className="relative">
                <button
                  type="button"
                  role="radio"
                  aria-checked={escopo === o.v}
                  onClick={() => {
                    setEscopo(o.v);
                    setAberto(o.v === "cidade" ? (aberto === "cidade" ? null : "cidade") : null);
                  }}
                  className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-xs transition-colors ${
                    escopo === o.v ? "bg-night text-white" : "hover:bg-white"
                  }`}
                >
                  <span className="font-medium">{o.t}</span>
                  <span className={`max-w-28 truncate font-mono text-[10px] ${escopo === o.v ? "text-neon" : "opacity-50"}`}>{o.d}</span>
                </button>
                {o.v === "cidade" && aberto === "cidade" && <div className="absolute left-0 top-full z-40 mt-2">{seletorCidade(escolherCidade)}</div>}
              </div>
            ))}
          </div>

          {/* Atividade (CNAE) */}
          <div className="relative">
            <button type="button" onClick={() => setAberto(aberto === "cnae" ? null : "cnae")} className={chip(cnaesSel.length > 0)} aria-expanded={aberto === "cnae"}>
              Atividade{cnaesSel.length ? ` · ${cnaesSel.length}` : ""} <ChevronDown size={12} className="ml-1 inline" aria-hidden />
            </button>
            {aberto === "cnae" && (
              <div className="absolute left-0 top-full z-40 mt-2 w-[26rem] max-w-[90vw] rounded-2xl border border-night/10 bg-white p-3 shadow-2xl">
                <label className="relative block">
                  <span className="sr-only">Buscar atividade</span>
                  <Search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    autoFocus
                    value={buscaCnae}
                    onChange={(e) => setBuscaCnae(e.target.value)}
                    placeholder="Ex.: transporte, 4930-2/02"
                    className="min-h-10 w-full rounded-full border border-night/15 pl-8 pr-3 text-xs focus:border-night focus:outline-none"
                  />
                </label>
                <ul className="mt-2 max-h-72 space-y-0.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {cnaesFiltrados.map((c) => {
                    const on = cnaesSel.includes(c.code);
                    return (
                      <li key={c.code}>
                        <button
                          type="button"
                          onClick={() => setCnaesSel((s) => toggle(s, c.code))}
                          aria-pressed={on}
                          className={`flex w-full cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2 text-left text-xs ${on ? "bg-neon/40" : "hover:bg-night/5"}`}
                        >
                          <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border ${on ? "border-night bg-night text-neon" : "border-night/30"}`}>
                            {on && <Check size={11} aria-hidden />}
                          </span>
                          <span>
                            <span className="font-mono opacity-50">{formatCnae(c.code)}</span> {c.description}
                            <span className="ml-1 opacity-40">({fmt(c.count)})</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {!cnaesFiltrados.length && <li className="px-3 py-2 text-xs opacity-50">Nenhuma atividade encontrada.</li>}
                </ul>
              </div>
            )}
          </div>

          {/* Estados */}
          <div className="relative">
            <button type="button" onClick={() => setAberto(aberto === "estados" ? null : "estados")} className={chip(ufsFiltro.length > 0)} aria-expanded={aberto === "estados"}>
              Estados{ufsFiltro.length ? ` · ${ufsFiltro.join(", ")}` : ""} <ChevronDown size={12} className="ml-1 inline" aria-hidden />
            </button>
            {aberto === "estados" && (
              <div className="absolute left-0 top-full z-40 mt-2 w-80 rounded-2xl border border-night/10 bg-white p-4 shadow-2xl">
                <p className="text-[11px] leading-relaxed opacity-60">
                  Marcar um estado leva o círculo até ele. <span className="mx-1 inline-block size-2 rounded-full bg-neon align-middle ring-1 ring-night/30" />
                  já tem empresas na base
                  {estadosComDados.length > 0 && <> · hoje: {estadosComDados.map(([u, n]) => `${u} (${fmt(n)})`).join(", ")}</>}
                </p>
                <div className="mt-3 grid grid-cols-7 gap-1.5">
                  {UFS.map((u) => {
                    const on = ufsFiltro.includes(u);
                    return (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          setUfsFiltro((s) => toggle(s, u));
                          if (!on) irParaEstado(u);
                        }}
                        aria-pressed={on}
                        title={semDados(u) ? `${nomeEstado(u)}: ainda sem empresas na base` : `${nomeEstado(u)}: ${fmt(ufsComDados[u])} empresas na base`}
                        className={`relative min-h-8 cursor-pointer rounded-full border font-mono text-[11px] ${
                          on ? "border-night bg-night text-white" : estados.includes(u) ? "border-night/40" : "border-night/10 opacity-60 hover:opacity-100"
                        }`}
                      >
                        {u}
                        {!semDados(u) && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-neon ring-2 ring-white" />}
                      </button>
                    );
                  })}
                </div>
                {ufsFiltro.length > 0 && (
                  <button type="button" onClick={() => setUfsFiltro([])} className="mt-3 cursor-pointer text-xs underline underline-offset-4">
                    Limpar estados
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Porte */}
          {(["ME", "EPP", "DEMAIS"] as const).map((p) => (
            <button key={p} type="button" onClick={() => setPortes((s) => toggle(s, p))} aria-pressed={portes.includes(p)} className={chip(portes.includes(p))}>
              {SIZE_LABEL[p]}
            </button>
          ))}
          <button type="button" onClick={() => setTemEmail((v) => !v)} aria-pressed={temEmail} className={chip(temEmail)}>
            Com e-mail
          </button>
          <button type="button" onClick={() => setMatriz((v) => !v)} aria-pressed={matriz} className={chip(matriz)}>
            Só matrizes
          </button>

          {/* status ao vivo */}
          <span className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">
            {carregando ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Radio size={12} className="text-emerald-600" aria-hidden />}
            {carregando ? "Atualizando" : "Ao vivo"}
          </span>
        </div>

        {/* atividades escolhidas */}
        {cnaesSel.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {cnaesSel.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  onClick={() => setCnaesSel((s) => s.filter((x) => x !== c))}
                  className="flex max-w-[22rem] cursor-pointer items-center gap-2 rounded-full bg-neon py-1.5 pl-3 pr-2 text-left text-xs"
                  title="Remover"
                >
                  <span className="truncate">
                    {formatCnae(c)} · {nomeCnae(c)}
                  </span>
                  <X size={12} aria-hidden className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Glass>

      {/* fecha os menus ao clicar fora */}
      {aberto && <div aria-hidden className="fixed inset-0 z-20" onClick={() => setAberto(null)} />}

      {/* ================= Mapa + lista ================= */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
        {/* -------- Mapa -------- */}
        <Glass className={`no-fx overflow-hidden lg:sticky lg:top-24 ${aberto === "cidade-barra" ? "relative z-30" : ""}`}>
          <div className="relative isolate h-[380px] md:h-[480px]">
            <RadiusMap
              centro={centro}
              raioKm={raioKm}
              cidades={cidades.slice(0, 400)}
              fitToken={fitToken}
              circuloAtivo={escopo === "raio"}
              empresas={empresasNoMapa}
              foco={foco}
              onFoco={setFoco}
              modo={modoMapa}
              voar={voar}
              onChange={mover}
            />

            {/* resumo */}
            <div className="pointer-events-none absolute left-3 top-3 z-[500] flex flex-wrap gap-2">
              <span className="rounded-full bg-night px-3 py-1.5 font-mono text-[11px] text-neon shadow-lg">
                {escopo === "cidade" ? `Só ${perto.name}` : escopo === "estado" ? `Todo ${ufsDoEstado.join(", ")}` : `${raioKm} km`}
              </span>
              <span className="rounded-full bg-white/90 px-3 py-1.5 text-[11px] shadow-lg backdrop-blur">
                <b className="font-medium">{fmt(cidades.length)}</b> cidades · {estados.join(", ") || "—"}
              </span>
            </div>

            {/* tipo de mapa */}
            <div role="radiogroup" aria-label="Tipo de mapa" className="absolute right-3 top-3 z-[500] flex rounded-full bg-white/95 p-1 text-[11px] shadow-lg backdrop-blur">
              {(
                [
                  ["auto", "Auto"],
                  ["mapa", "Mapa"],
                  ["satelite", "Satélite"],
                ] as [ModoMapa, string][]
              ).map(([v, t]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={modoMapa === v}
                  onClick={() => setModoMapa(v)}
                  title={v === "auto" ? "Mapa de ruas de longe, satélite de perto" : undefined}
                  className={`cursor-pointer rounded-full px-3 py-1 font-medium ${modoMapa === v ? "bg-night text-white" : "hover:bg-night/5"}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[11px] shadow-lg backdrop-blur">
              <Crosshair size={12} aria-hidden /> Centro: <b className="font-medium">{perto.name}/{perto.uf}</b>
            </div>
            {aviso && (
              <div role="alert" className="absolute inset-x-3 top-14 z-[600] flex items-start justify-between gap-3 rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-900 shadow-lg">
                {aviso}
                <button type="button" aria-label="Fechar aviso" onClick={() => setAviso(null)} className="cursor-pointer">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* raio */}
          <div className="flex items-center gap-3 border-t border-night/10 px-4 py-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">Raio</span>
            <input
              type="range"
              min={RAIO_MIN_KM}
              max={RAIO_MAX_KM}
              step={5}
              value={raioKm}
              aria-label="Raio em km"
              onChange={(e) => {
                setRaioKm(Number(e.target.value));
                setEscopo("raio");
              }}
              onPointerUp={() => setFitToken((t) => t + 1)}
              onKeyUp={() => setFitToken((t) => t + 1)}
              className="h-2 flex-1 cursor-pointer accent-night"
            />
            <span className="w-14 text-right font-mono text-sm tabular-nums">{raioKm} km</span>
          </div>

          {/* ampliar */}
          <div className="flex flex-wrap items-center gap-2 border-t border-night/10 bg-white/40 px-4 py-3">
            <span className="mr-1 text-xs font-medium">Ampliar:</span>
            {[10, 25, 50, 100, 200, 400]
              .filter((km) => escopo !== "raio" || km > raioKm)
              .slice(0, 2)
              .map((km) => (
                <button key={km} type="button" onClick={() => ampliarRaio(km)} className="min-h-8 cursor-pointer rounded-full border border-night/15 bg-white px-3 text-[11px] font-medium hover:bg-night hover:text-white">
                  {km} km
                </button>
              ))}
            <button
              type="button"
              onClick={() => {
                setEscopo("estado");
                setUfsFiltro([perto.uf]);
              }}
              className="min-h-8 cursor-pointer rounded-full bg-night px-3 text-[11px] font-medium text-white hover:bg-neon hover:text-night"
            >
              Todo {perto.uf}
            </button>
            <label className="relative">
              <span className="sr-only">Buscar em outro estado</span>
              <select
                value=""
                onChange={(e) => e.target.value && outroEstado(e.target.value)}
                className="min-h-8 cursor-pointer appearance-none rounded-full border border-night/15 bg-white py-1 pl-3 pr-7 text-[11px] font-medium hover:border-night/40"
              >
                <option value="">Outro estado…</option>
                {UFS.filter((u) => u !== perto.uf).map((u) => (
                  <option key={u} value={u}>
                    {u} · {nomeEstado(u)}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60" />
            </label>
            <div className="relative">
              <button
                type="button"
                aria-expanded={aberto === "cidade-barra"}
                onClick={() => setAberto(aberto === "cidade-barra" ? null : "cidade-barra")}
                className="flex min-h-8 cursor-pointer items-center gap-1 rounded-full border border-night/15 bg-white px-3 text-[11px] font-medium hover:border-night/40"
              >
                Outra cidade… <ChevronDown size={12} aria-hidden className="rotate-180 opacity-60" />
              </button>
              {aberto === "cidade-barra" && <div className="absolute bottom-full right-0 z-40 mb-2">{seletorCidade(escolherCidade)}</div>}
            </div>
          </div>
        </Glass>

        {/* -------- Lista ao vivo -------- */}
        <Glass className="no-fx flex flex-col overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-2 border-b border-night/10 p-5">
            <div>
              <Micro>Empresas encontradas</Micro>
              <p className="mt-2 text-4xl font-light tracking-[-0.05em] tabular-nums">
                {res?.total != null ? fmt(res.total) : "—"}
                <span className="ml-2 text-sm tracking-normal opacity-60">em {alcanceTexto}</span>
              </p>
            </div>
            {res && res.items.length > 0 && (
              <span className="flex items-center gap-2 rounded-full bg-night px-3 py-1.5 text-[11px] text-white">
                {localizando ? <Loader2 size={12} className="animate-spin text-neon" aria-hidden /> : <MapPin size={12} className="text-neon" aria-hidden />}
                {localizando ? "Localizando pelo CEP…" : `${fmt(empresasNoMapa.length)} de ${fmt(res.items.length)} no mapa`}
              </span>
            )}
          </div>

          {erro && (
            <p role="alert" className="m-4 rounded-2xl bg-rose-100 px-4 py-3 text-sm text-rose-900">
              {erro}
            </p>
          )}

          <ul className={`max-h-[640px] divide-y divide-night/10 overflow-y-auto [scrollbar-width:thin] ${carregando && !res ? "opacity-60" : ""}`}>
            {!res && carregando &&
              Array.from({ length: 6 }, (_, i) => (
                <li key={i} className="flex gap-3 p-4">
                  <span className="size-10 animate-pulse rounded-full bg-night/10" />
                  <span className="flex-1 space-y-2">
                    <span className="block h-3 w-2/3 animate-pulse rounded bg-night/10" />
                    <span className="block h-3 w-1/3 animate-pulse rounded bg-night/10" />
                  </span>
                </li>
              ))}
            {res?.items.map((c, idx) => {
              const pin = noMapa.get(c.cnpj);
              return (
                <li
                  key={c.cnpj}
                  onMouseEnter={() => setFoco(c.cnpj)}
                  onMouseLeave={() => setFoco(null)}
                  className={`group flex gap-3 p-4 transition-colors ${foco === c.cnpj ? "bg-neon/25" : "hover:bg-white/60"}`}
                >
                  {/* posição + estado no mapa */}
                  <button
                    type="button"
                    disabled={!pin}
                    onClick={() => pin && setVoar({ lat: pin.lat, lng: pin.lng, token: Date.now() })}
                    title={pin ? "Ver a rua no mapa" : "Sem localização pelo CEP"}
                    className={`flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full font-mono text-[11px] disabled:cursor-default ${
                      pin?.destaque ? "bg-neon text-night ring-1 ring-night" : pin ? "bg-night text-white" : "bg-night/10 text-night/50"
                    }`}
                  >
                    {pin ? <Locate size={15} aria-hidden /> : idx + 1}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <Link href={`/empresas/${c.cnpj}`} className="font-medium tracking-[-0.01em] underline-offset-4 hover:underline">
                        {c.name}
                      </Link>
                      <span className="font-mono text-xs tabular-nums">{formatMoney(c.shareCapital)}</span>
                    </div>
                    <p className="mt-0.5 text-xs opacity-60">
                      {[c.address, c.district].filter(Boolean).join(" · ")}
                      {(c.address || c.district) && " — "}
                      {[c.city, c.uf].filter(Boolean).join("/")}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-3 font-mono text-[10px] uppercase tracking-widest opacity-50">
                      <span>{formatCnpj(c.cnpj)}</span>
                      <span>{SIZE_LABEL[c.size] ?? "—"}</span>
                      {!c.isHeadquarters && <span>filial</span>}
                    </p>
                    <div className="mt-2">
                      <ContactCell email={c.email} phones={c.phones} inline />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {res && !res.items.length && !carregando && (
            <div className="px-6 py-14 text-center text-sm opacity-70">
              <Building2 size={28} aria-hidden className="mx-auto mb-3 opacity-40" />
              {res.ufs.length > 0 && res.ufs.every(semDados)
                ? `Ainda não importamos empresas de ${res.ufs.join(", ")} para a base. Hoje há dados de: ${estadosComDados.map(([u]) => u).join(", ") || "nenhum estado"}.`
                : "Nenhuma empresa aqui com esses filtros. Amplie o raio ou mude a atividade."}
            </div>
          )}

          {res?.nextCursor && (
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
      </div>
    </div>
  );
}
