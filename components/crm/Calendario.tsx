"use client";

import { cores } from "@/lib/colors";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Download, Mail, Pencil, Plus, Trash2, UserRound, X } from "lucide-react";
import { WhatsappIcon } from "@/components/brand/Icons";
import type { Lead } from "@/lib/lead-types";
import { CATEGORIAS, categoria, type CategoriaId, type Reuniao } from "@/lib/meeting-types";
import { iniciais } from "@/lib/crm";
import { baixarIcs, linkGoogleAgenda } from "@/lib/agenda";
import { DIAS_CURTOS, DIAS_LETRA, MESES, diaDaSemana, gradeDoMes, hhmm, inicioDaSemana, inicioDoDia, mesmoDia, somarDias } from "./datas";

type Vista = "mes" | "semana" | "dia";

const HORA_INICIO = 7;
const HORA_FIM = 21;
const ALTURA_HORA = 60; // px

const celular = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length === 11 && d[2] === "9" ? d : null;
};

/** Organiza reuniões que se sobrepõem lado a lado (raias). */
function emRaias(lista: Reuniao[]) {
  const ord = [...lista].sort((a, b) => a.start.localeCompare(b.start));
  const fins: number[] = [];
  const raia = new Map<string, number>();
  for (const r of ord) {
    const ini = new Date(r.start).getTime();
    let i = fins.findIndex((f) => f <= ini);
    if (i === -1) i = fins.length;
    fins[i] = new Date(r.end).getTime();
    raia.set(r.id, i);
  }
  return { raia, total: Math.max(1, fins.length) };
}

export default function Calendario({
  leads,
  reunioes,
  onNova,
  onEditar,
  onCancelar,
}: {
  leads: Lead[];
  reunioes: Reuniao[];
  /** abre o formulário de nova reunião (opcionalmente já com o horário clicado) */
  onNova: (inicio?: Date) => void;
  onEditar: (r: Reuniao) => void;
  onCancelar: (r: Reuniao) => void;
}) {
  const [vista, setVista] = useState<Vista>("semana");
  const [ref, setRef] = useState(() => inicioDoDia(new Date()));
  const [mesMini, setMesMini] = useState(() => new Date());
  const [ocultas, setOcultas] = useState<Set<CategoriaId>>(new Set());
  const [aberta, setAberta] = useState<{ r: Reuniao; x: number; y: number } | null>(null);
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const leadPorId = useMemo(() => new Map(leads.map((l) => [l.id, l])), [leads]);
  const visiveis = useMemo(() => reunioes.filter((r) => !ocultas.has(r.category)), [reunioes, ocultas]);
  const doDia = (d: Date) => visiveis.filter((r) => mesmoDia(new Date(r.start), d));
  const comReuniao = useMemo(() => new Set(visiveis.map((r) => inicioDoDia(new Date(r.start)).getTime())), [visiveis]);

  const dias = vista === "dia" ? [ref] : Array.from({ length: 7 }, (_, i) => somarDias(inicioDaSemana(ref), i));
  const proximas = useMemo(
    () =>
      visiveis
        .filter((r) => new Date(r.end) >= agora)
        .sort((a, b) => a.start.localeCompare(b.start))
        .slice(0, 5),
    [visiveis, agora],
  );

  function navegar(dir: number) {
    setAberta(null);
    setRef((d) => (vista === "mes" ? new Date(d.getFullYear(), d.getMonth() + dir, 1) : somarDias(d, dir * (vista === "dia" ? 1 : 7))));
  }
  function irPara(d: Date) {
    setRef(inicioDoDia(d));
    setMesMini(d);
    setAberta(null);
  }

  const titulo = `${MESES[ref.getMonth()]} ${ref.getFullYear()}`;
  const linhaAgoraTop = ((agora.getHours() + agora.getMinutes() / 60 - HORA_INICIO) * ALTURA_HORA);

  return (
    <div className="grid gap-3 lg:grid-cols-[290px_minmax(0,1fr)]">
      {/* ================= Lateral escura ================= */}
      <aside className="aura-night no-fx space-y-3 rounded-[28px] p-3 text-white">
        {/* mini calendário */}
        <div className="rounded-[22px] bg-white/[0.06] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {MESES[mesMini.getMonth()]} {mesMini.getFullYear()}
            </p>
            <div className="flex gap-1">
              <button type="button" aria-label="Mês anterior" onClick={() => setMesMini((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-white/10">
                <ChevronLeft size={14} />
              </button>
              <button type="button" aria-label="Próximo mês" onClick={() => setMesMini((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-white/10">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-y-1 text-center text-[11px]">
            {DIAS_LETRA.map((d, i) => (
              <span key={i} className="pb-1 font-medium text-white/40">
                {d}
              </span>
            ))}
            {gradeDoMes(mesMini).map((d) => {
              const fora = d.getMonth() !== mesMini.getMonth();
              const hoje = mesmoDia(d, agora);
              const sel = mesmoDia(d, ref);
              const tem = comReuniao.has(d.getTime());
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => irPara(d)}
                  className={`relative mx-auto flex size-7 cursor-pointer items-center justify-center rounded-full transition-colors ${
                    sel ? "bg-neon font-medium text-night" : hoje ? "ring-1 ring-neon text-neon" : fora ? "text-white/25 hover:bg-white/10" : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  {d.getDate()}
                  {tem && !sel && <span className="absolute bottom-0.5 size-1 rounded-full bg-neon" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* categorias */}
        <div className="rounded-[22px] bg-white/[0.06] p-4">
          <p className="text-sm font-medium">Categorias</p>
          <ul className="mt-3 space-y-1">
            {CATEGORIAS.map((c) => {
              const on = !ocultas.has(c.id);
              const n = reunioes.filter((r) => r.category === c.id).length;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setOcultas((s) => {
                        const n2 = new Set(s);
                        if (n2.has(c.id)) n2.delete(c.id);
                        else n2.add(c.id);
                        return n2;
                      })
                    }
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-white/10"
                  >
                    <span className="flex size-4 items-center justify-center rounded border" style={{ borderColor: c.borda, background: on ? c.cor : "transparent" }} />
                    <span className={on ? "" : "opacity-40"}>{c.nome}</span>
                    <span className="ml-auto font-mono text-[10px] text-white/40">{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* próximas reuniões */}
        <div className="rounded-[22px] bg-white/[0.06] p-4">
          <p className="text-sm font-medium">Próximas reuniões</p>
          <ul className="mt-3 space-y-2.5">
            {proximas.map((r) => {
              const l = leadPorId.get(r.leadId);
              const c = categoria(r.category);
              const d = new Date(r.start);
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => irPara(d)} className="flex w-full cursor-pointer items-center gap-3 rounded-xl text-left hover:bg-white/5">
                    <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[11px] text-neon">
                      {l ? iniciais(l.name) : <UserRound size={14} />}
                      <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-night" style={{ background: c.borda }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{r.title}</span>
                      <span className="block text-[11px] text-white/50">
                        {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} · {hhmm(d)}
                        {l && ` · ${l.company}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {!proximas.length && <li className="text-xs text-white/40">Nenhuma reunião agendada.</li>}
          </ul>
        </div>
      </aside>

      {/* ================= Calendário ================= */}
      <section
        className="no-fx relative overflow-hidden rounded-[28px] border border-white/70 p-4 md:p-5"
        style={{ background: "linear-gradient(115deg, var(--color-agenda-faixa-1) 0%, var(--color-agenda-faixa-2) 30%, var(--color-agenda-faixa-3) 70%, var(--color-agenda-faixa-4) 100%)" }}
      >
        {/* cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-medium tracking-[-0.04em] md:text-3xl">{vista === "dia" ? ref.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : titulo}</h3>
            <button type="button" onClick={() => irPara(new Date())} className="cursor-pointer rounded-full bg-night px-3 py-1 text-xs font-medium text-white">
              Hoje
            </button>
            <div className="flex">
              <button type="button" aria-label="Anterior" onClick={() => navegar(-1)} className="flex size-8 cursor-pointer items-center justify-center rounded-full hover:bg-white/70">
                <ChevronLeft size={16} />
              </button>
              <button type="button" aria-label="Próximo" onClick={() => navegar(1)} className="flex size-8 cursor-pointer items-center justify-center rounded-full hover:bg-white/70">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div role="radiogroup" aria-label="Visualização" className="flex rounded-full bg-white/60 p-1 text-xs backdrop-blur">
              {(
                [
                  ["mes", "Mês"],
                  ["semana", "Semana"],
                  ["dia", "Dia"],
                ] as [Vista, string][]
              ).map(([v, t]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={vista === v}
                  onClick={() => {
                    setVista(v);
                    setAberta(null);
                  }}
                  className={`cursor-pointer rounded-full px-4 py-1.5 font-medium ${vista === v ? "bg-white shadow" : "opacity-60 hover:opacity-100"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => onNova()} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full bg-night px-5 text-sm font-medium text-white hover:bg-neon hover:text-night">
              <Plus size={15} aria-hidden /> Nova reunião
            </button>
          </div>
        </div>

        {/* ---------- Mês ---------- */}
        {vista === "mes" && (
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {DIAS_CURTOS.map((d) => (
              <span key={d} className="px-2 font-mono text-[10px] uppercase tracking-widest opacity-50">
                {d}
              </span>
            ))}
            {gradeDoMes(ref).map((d) => {
              const lista = doDia(d);
              const hoje = mesmoDia(d, agora);
              return (
                <div
                  key={d.toISOString()}
                  onClick={() => onNova(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9))}
                  className={`min-h-24 cursor-pointer rounded-2xl p-1.5 transition-colors hover:bg-white/80 ${
                    d.getMonth() !== ref.getMonth() ? "bg-white/20 opacity-50" : "bg-white/50"
                  }`}
                >
                  <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${hoje ? "bg-night text-neon" : ""}`}>{d.getDate()}</span>
                  <ul className="mt-1 space-y-1">
                    {lista.slice(0, 3).map((r) => {
                      const c = categoria(r.category);
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAberta({ r, x: e.clientX, y: e.clientY });
                            }}
                            className="w-full cursor-pointer truncate rounded-lg px-1.5 py-0.5 text-left text-[10px]"
                            style={{ background: c.cor, color: c.texto }}
                          >
                            {hhmm(new Date(r.start))} {r.title}
                          </button>
                        </li>
                      );
                    })}
                    {lista.length > 3 && <li className="px-1 text-[10px] opacity-60">+{lista.length - 3}</li>}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------- Semana / Dia ---------- */}
        {vista !== "mes" && (
          <div className="mt-4">
            {/* cabeçalho dos dias */}
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `56px repeat(${dias.length}, minmax(0, 1fr))` }}>
              <span className="flex items-center justify-center rounded-2xl bg-white/40 font-mono text-[10px] opacity-60">GMT-3</span>
              {dias.map((d) => {
                const hoje = mesmoDia(d, agora);
                const sel = mesmoDia(d, ref) && vista === "semana";
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => {
                      setRef(d);
                      if (vista === "semana") setVista("dia");
                    }}
                    className={`flex cursor-pointer items-baseline justify-center gap-2 rounded-2xl px-2 py-3 transition-colors ${
                      hoje ? "bg-neon text-night" : sel ? "bg-white text-night shadow" : "bg-white/40 hover:bg-white/70"
                    }`}
                  >
                    <span className="text-xs opacity-60">{DIAS_CURTOS[diaDaSemana(d)]}</span>
                    <span className="text-2xl font-medium tracking-[-0.04em]">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>

            {/* grade de horários */}
            <div className="mt-2 max-h-[560px] overflow-y-auto rounded-[22px] bg-white/55 [scrollbar-width:thin]">
              <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${dias.length}, minmax(0, 1fr))` }}>
                {/* horas */}
                <div>
                  {Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => (
                    <div key={i} className="relative text-right font-mono text-[10px] opacity-50" style={{ height: ALTURA_HORA }}>
                      <span className="absolute -top-1.5 right-2">{i === 0 ? "" : `${HORA_INICIO + i}h`}</span>
                    </div>
                  ))}
                </div>

                {dias.map((d) => {
                  const lista = doDia(d);
                  const { raia, total } = emRaias(lista);
                  const hoje = mesmoDia(d, agora);
                  return (
                    <div key={d.toISOString()} className="relative border-l border-night/5">
                      {/* faixas clicáveis por hora */}
                      {Array.from({ length: HORA_FIM - HORA_INICIO }, (_, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-label={`Nova reunião ${d.toLocaleDateString("pt-BR")} às ${HORA_INICIO + i}h`}
                          onClick={() => onNova(new Date(d.getFullYear(), d.getMonth(), d.getDate(), HORA_INICIO + i))}
                          className="group block w-full cursor-pointer border-t border-night/5 hover:bg-white/70"
                          style={{ height: ALTURA_HORA }}
                        >
                          <Plus size={14} className="mx-auto opacity-0 transition-opacity group-hover:opacity-30" aria-hidden />
                        </button>
                      ))}

                      {/* agora */}
                      {hoje && linhaAgoraTop > 0 && linhaAgoraTop < (HORA_FIM - HORA_INICIO) * ALTURA_HORA && (
                        <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: linhaAgoraTop }}>
                          <span className="-ml-1 size-2 rounded-full bg-night" />
                          <span className="h-px flex-1 bg-night" />
                        </div>
                      )}

                      {/* reuniões */}
                      {lista.map((r) => {
                        const ini = new Date(r.start);
                        const fim = new Date(r.end);
                        const top = Math.max(0, (ini.getHours() + ini.getMinutes() / 60 - HORA_INICIO) * ALTURA_HORA);
                        const altura = Math.max(26, ((fim.getTime() - ini.getTime()) / 3_600_000) * ALTURA_HORA - 3);
                        const c = categoria(r.category);
                        const l = leadPorId.get(r.leadId);
                        const largura = 100 / total;
                        return (
                          <div
                            key={r.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`${r.title}, ${hhmm(ini)} às ${hhmm(fim)}`}
                            onClick={(e) => setAberta({ r, x: e.clientX, y: e.clientY })}
                            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setAberta({ r, x: 0, y: 0 })}
                            className="absolute z-[5] flex cursor-pointer flex-col justify-start overflow-hidden rounded-xl border-l-[3px] px-2 py-1.5 text-left shadow-sm transition-transform hover:z-20 hover:-translate-y-0.5"
                            style={{
                              top: top + 1,
                              height: altura,
                              left: `calc(${(raia.get(r.id) ?? 0) * largura}% + 3px)`,
                              width: `calc(${largura}% - 6px)`,
                              background: c.cor,
                              borderColor: c.borda,
                              color: c.texto,
                            }}
                          >
                            <span className="shrink-0 truncate text-xs font-medium leading-snug">{r.title}</span>
                            <span className="shrink-0 truncate text-[10px] opacity-75">
                              {hhmm(ini)} – {hhmm(fim)}
                            </span>
                            {l && altura >= 72 && (
                              <span className="mt-auto flex items-center gap-1.5">
                                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-night font-mono text-[8px] text-neon">{iniciais(l.name)}</span>
                                <span className="truncate text-[10px]">{l.company}</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* card da reunião (como o pop-up da referência) */}
        {aberta && (
          <DetalheReuniao
            r={aberta.r}
            lead={leadPorId.get(aberta.r.leadId)}
            onFechar={() => setAberta(null)}
            onEditar={() => {
              onEditar(aberta.r);
              setAberta(null);
            }}
            onCancelar={() => {
              onCancelar(aberta.r);
              setAberta(null);
            }}
          />
        )}
      </section>
    </div>
  );
}

function DetalheReuniao({
  r,
  lead,
  onFechar,
  onEditar,
  onCancelar,
}: {
  r: Reuniao;
  lead?: Lead;
  onFechar: () => void;
  onEditar: () => void;
  onCancelar: () => void;
}) {
  const c = categoria(r.category);
  const ini = new Date(r.start);
  const fim = new Date(r.end);
  const zap = lead ? celular(lead.phone) : null;
  return (
    <>
      <div aria-hidden className="fixed inset-0 z-30" onClick={onFechar} />
      <div role="dialog" aria-label={r.title} className="previa-in absolute right-6 top-24 z-40 w-[330px] rounded-[22px] bg-white p-5 shadow-[0_30px_70px_-25px_color-mix(in_srgb,var(--color-black)_55%,transparent)]">
        <div className="flex items-start justify-between gap-3">
          <p className="text-lg font-medium leading-tight tracking-[-0.02em]">{r.title}</p>
          <button type="button" aria-label="Fechar" onClick={onFechar} className="cursor-pointer opacity-50 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
        <span className="mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: c.cor, color: c.texto }}>
          {c.nome}
        </span>
        <ul className="mt-4 space-y-2.5 text-sm">
          <li className="flex items-center gap-3">
            <CalendarDays size={15} className="opacity-50" aria-hidden />
            {ini.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </li>
          <li className="flex items-center gap-3">
            <Clock size={15} className="opacity-50" aria-hidden />
            {hhmm(ini)} – {hhmm(fim)}
          </li>
          {lead && (
            <li className="flex items-center gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-night font-mono text-[10px] text-neon">{iniciais(lead.name)}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{lead.name}</span>
                <span className="block truncate text-xs opacity-60">
                  {lead.role ? `${lead.role} · ` : ""}
                  {lead.company}
                </span>
              </span>
            </li>
          )}
        </ul>
        {r.notes && <p className="mt-3 rounded-xl bg-night/5 p-3 text-xs leading-relaxed">{r.notes}</p>}
        {/* levar para a agenda de verdade */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={linkGoogleAgenda(r, lead)}
            target="_blank"
            rel="noopener noreferrer"
            title="Abre o Google Agenda com o evento preenchido (ative o Google Meet ao salvar)"
            className="flex min-h-9 items-center justify-center gap-2 rounded-full border border-night/15 px-3 text-xs font-medium hover:bg-night hover:text-white"
          >
            <GoogleG /> Google Agenda
          </a>
          <button
            type="button"
            onClick={() => baixarIcs(r, lead)}
            title="Arquivo .ics para Outlook, Apple e outras agendas"
            className="flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-full border border-night/15 px-3 text-xs font-medium hover:bg-night hover:text-white"
          >
            <Download size={13} aria-hidden /> Baixar .ics
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {zap && (
            <a href={`https://wa.me/55${zap}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="flex size-9 items-center justify-center rounded-full bg-whatsapp text-white">
              <WhatsappIcon size={15} />
            </a>
          )}
          {lead?.email && (
            <a href={`mailto:${lead.email}?subject=${encodeURIComponent(r.title)}`} title={lead.email} className="flex size-9 items-center justify-center rounded-full border border-night/15 hover:bg-night hover:text-white">
              <Mail size={15} aria-hidden />
            </a>
          )}
          <button type="button" onClick={onEditar} className="ml-auto flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-night px-4 text-xs font-medium text-white hover:bg-neon hover:text-night">
            <Pencil size={13} aria-hidden /> Editar
          </button>
          <button type="button" onClick={onCancelar} title="Cancelar reunião" className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-night/15 hover:border-danger-500 hover:bg-danger-500 hover:text-white">
            <Trash2 size={14} aria-hidden />
          </button>
        </div>
      </div>
    </>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden>
      <path fill={cores["google-azul"]} d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
      <path fill={cores["google-verde"]} d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
      <path fill={cores["google-amarelo"]} d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8z" />
      <path fill={cores["google-vermelho"]} d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  );
}
