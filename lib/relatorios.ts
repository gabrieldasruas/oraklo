import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { faixaScore } from "./score";
import { SIZE_LABEL } from "./format";

// Relatórios calculados com o que o CRM já registra (leads + lead_events + empresas).
// Período no fuso de Brasília; comparação sempre com o período anterior de mesmo tamanho.

const DIA = 86_400_000;
const TZ = "America/Sao_Paulo";
const diaSP = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD
const inicioDoDia = (ymd: string) => new Date(`${ymd}T00:00:00-03:00`);

export type Periodo = { chave: "7" | "30" | "90" | "custom"; ini: Date; fim: Date; de: string; ate: string; rotulo: string };

export function lerPeriodo(sp: Record<string, string | string[] | undefined>): Periodo {
  const p = typeof sp.periodo === "string" ? sp.periodo : "30";
  const hoje = diaSP(new Date());
  const fimHoje = new Date(inicioDoDia(hoje).getTime() + DIA);
  const de = typeof sp.de === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.de) ? sp.de : null;
  const ate = typeof sp.ate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.ate) ? sp.ate : null;
  if (p === "custom" && de && ate && de <= ate) {
    const ini = inicioDoDia(de);
    const fim = new Date(Math.min(inicioDoDia(ate).getTime() + DIA, ini.getTime() + 366 * DIA));
    const f = (s: string) => s.split("-").reverse().join("/");
    return { chave: "custom", ini, fim, de, ate, rotulo: `${f(de)} a ${f(ate)}` };
  }
  const n = p === "7" ? 7 : p === "90" ? 90 : 30;
  const ini = new Date(fimHoje.getTime() - n * DIA);
  return { chave: String(n) as Periodo["chave"], ini, fim: fimHoje, de: diaSP(ini), ate: hoje, rotulo: `Últimos ${n} dias` };
}

type Lead = { id: string; name: string; company: string; status: string; score: number; created_at: string; cnpj: string | null; place: string };
type Ev = { lead_id: string; type: string; payload: Record<string, unknown> | null; created_at: string };

export type Kpi = { rotulo: string; valor: number; anterior: number; formato?: "pct" };
export type Balde = { rotulo: string; contatados: number; respostas: number; reunioes: number; enviados: number; abertos: number };
export type EtapaFunil = { rotulo: string; valor: number; conversao: number | null };
export type Grupo = { nome: string; leads: number; respostas: number; reunioes: number };
export type FaixaResultado = { rotulo: string; cor: string; leads: number; respostas: number; reunioes: number };

export type Relatorio = {
  periodo: Periodo;
  kpis: Kpi[];
  serie: Balde[];
  granularidade: "dia" | "semana" | "mês";
  funil: EtapaFunil[];
  perdidos: number;
  maiorVazamento: { de: string; para: string; perda: number } | null;
  email: {
    enviados: number;
    followups: number;
    abertos: number;
    cliques: number;
    respondidos: number;
    respostasAposFollowup: number;
    mapa: number[][]; // 7 dias × 8 blocos de 3 h
    melhor: { dia: string; hora: string } | null;
  };
  segmentos: Grupo[];
  cidades: Grupo[];
  portes: Grupo[];
  score: FaixaResultado[];
  scoreMedio: { responderam: number | null; naoResponderam: number | null };
};

export const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const BLOCOS = ["0h", "3h", "6h", "9h", "12h", "15h", "18h", "21h"];

const dentro = (iso: string, ini: Date, fim: Date) => {
  const t = new Date(iso).getTime();
  return t >= ini.getTime() && t < fim.getTime();
};
const statusDe = (e: Ev) => String(e.payload?.status ?? e.payload?.to ?? "");

export async function montarRelatorio(db: SupabaseClient, periodo: Periodo): Promise<Relatorio> {
  const { ini, fim } = periodo;
  const dur = fim.getTime() - ini.getTime();
  const iniAnt = new Date(ini.getTime() - dur);

  const [{ data: leadsRaw }, { data: evRaw }] = await Promise.all([
    db.from("leads").select("id, name, company, status, score, created_at, cnpj, place").limit(10000),
    db
      .from("lead_events")
      .select("lead_id, type, payload, created_at")
      .in("type", ["status_changed", "email_sent", "email_opened", "email_clicked", "email_replied", "meeting_created"])
      .gte("created_at", iniAnt.toISOString())
      .order("created_at", { ascending: true })
      .limit(50000),
  ]);
  const leads = (leadsRaw ?? []) as Lead[];
  const eventos = (evRaw ?? []) as Ev[];

  // ---------- KPIs (período × anterior) ----------
  const medir = (a: Date, b: Date) => {
    const contatados = new Set<string>();
    const respostas = new Set<string>();
    let reunioes = 0;
    for (const e of eventos) {
      if (!dentro(e.created_at, a, b)) continue;
      if ((e.type === "email_sent" && Number(e.payload?.step ?? 1) === 1) || (e.type === "status_changed" && statusDe(e) !== "Novo")) contatados.add(e.lead_id);
      if (e.type === "email_replied" || (e.type === "status_changed" && statusDe(e) === "Respondeu")) respostas.add(e.lead_id);
      if (e.type === "meeting_created") reunioes++;
    }
    const novos = leads.filter((l) => dentro(l.created_at, a, b)).length;
    return { novos, contatados: contatados.size, respostas: respostas.size, reunioes, taxa: contatados.size ? (respostas.size / contatados.size) * 100 : 0 };
  };
  const atual = medir(ini, fim);
  const ant = medir(iniAnt, ini);
  const kpis: Kpi[] = [
    { rotulo: "Novos leads", valor: atual.novos, anterior: ant.novos },
    { rotulo: "Contatados", valor: atual.contatados, anterior: ant.contatados },
    { rotulo: "Taxa de resposta", valor: atual.taxa, anterior: ant.taxa, formato: "pct" },
    { rotulo: "Reuniões agendadas", valor: atual.reunioes, anterior: ant.reunioes },
  ];

  // ---------- série no tempo ----------
  const dias = Math.round(dur / DIA);
  const granularidade: Relatorio["granularidade"] = dias <= 14 ? "dia" : dias <= 120 ? "semana" : "mês";
  const passo = granularidade === "dia" ? DIA : granularidade === "semana" ? 7 * DIA : 30 * DIA;
  const nBaldes = Math.max(1, Math.ceil(dur / passo));
  const serie: Balde[] = Array.from({ length: nBaldes }, (_, i) => {
    const d = new Date(ini.getTime() + i * passo);
    const rot = granularidade === "mês" ? d.toLocaleDateString("pt-BR", { month: "short", timeZone: TZ }) : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: TZ });
    return { rotulo: rot, contatados: 0, respostas: 0, reunioes: 0, enviados: 0, abertos: 0 };
  });
  const vistos = { c: new Set<string>(), r: new Set<string>() };
  for (const e of eventos) {
    if (!dentro(e.created_at, ini, fim)) continue;
    const i = Math.min(nBaldes - 1, Math.floor((new Date(e.created_at).getTime() - ini.getTime()) / passo));
    const b = serie[i];
    const chave = `${i}:${e.lead_id}`;
    if ((e.type === "email_sent" && Number(e.payload?.step ?? 1) === 1) || (e.type === "status_changed" && statusDe(e) !== "Novo")) {
      if (!vistos.c.has(chave)) (vistos.c.add(chave), b.contatados++);
    }
    if (e.type === "email_replied" || (e.type === "status_changed" && statusDe(e) === "Respondeu")) {
      if (!vistos.r.has(chave)) (vistos.r.add(chave), b.respostas++);
    }
    if (e.type === "meeting_created") b.reunioes++;
    if (e.type === "email_sent") b.enviados++;
    if (e.type === "email_opened") b.abertos++;
  }

  // ---------- funil da coorte (leads que entraram no período) ----------
  const coorte = leads.filter((l) => dentro(l.created_at, ini, fim));
  const idsCoorte = new Set(coorte.map((l) => l.id));
  const chegou = { contatado: new Set<string>(), respondeu: new Set<string>(), reuniao: new Set<string>() };
  for (const l of coorte) {
    if (l.status !== "Novo") chegou.contatado.add(l.id);
    if (l.status === "Respondeu" || l.status === "Reunião marcada") chegou.respondeu.add(l.id);
    if (l.status === "Reunião marcada") chegou.reuniao.add(l.id);
  }
  for (const e of eventos) {
    if (!idsCoorte.has(e.lead_id)) continue;
    const s = statusDe(e);
    if (e.type === "email_sent" || (e.type === "status_changed" && s !== "Novo")) chegou.contatado.add(e.lead_id);
    if (e.type === "email_replied" || (e.type === "status_changed" && (s === "Respondeu" || s === "Reunião marcada"))) chegou.respondeu.add(e.lead_id);
    if (e.type === "meeting_created" || (e.type === "status_changed" && s === "Reunião marcada")) chegou.reuniao.add(e.lead_id);
  }
  // quem marcou reunião também respondeu e foi contatado
  for (const id of chegou.reuniao) chegou.respondeu.add(id);
  for (const id of chegou.respondeu) chegou.contatado.add(id);
  const valores = [coorte.length, chegou.contatado.size, chegou.respondeu.size, chegou.reuniao.size];
  const rotulos = ["Entraram no funil", "Contatados", "Responderam", "Reunião marcada"];
  const funil: EtapaFunil[] = valores.map((v, i) => ({ rotulo: rotulos[i], valor: v, conversao: i === 0 ? null : valores[i - 1] ? (v / valores[i - 1]) * 100 : 0 }));
  let maiorVazamento: Relatorio["maiorVazamento"] = null;
  for (let i = 1; i < funil.length; i++) {
    if (!valores[i - 1]) continue;
    const perda = 100 - (funil[i].conversao ?? 0);
    if (!maiorVazamento || perda > maiorVazamento.perda) maiorVazamento = { de: rotulos[i - 1], para: rotulos[i], perda };
  }
  const perdidos = coorte.filter((l) => l.status === "Sem interesse").length;

  // ---------- e-mails ----------
  const evP = eventos.filter((e) => dentro(e.created_at, ini, fim));
  const enviados = evP.filter((e) => e.type === "email_sent");
  const ids = (t: string) => new Set(evP.filter((e) => e.type === t).map((e) => String(e.payload?.providerId ?? e.lead_id)));
  const respondeuEm = new Map<string, number>();
  for (const e of evP) if (e.type === "email_replied" && !respondeuEm.has(e.lead_id)) respondeuEm.set(e.lead_id, new Date(e.created_at).getTime());
  const followPor = new Map<string, number>();
  for (const e of eventos) if (e.type === "email_sent" && Number(e.payload?.step) > 1 && !followPor.has(e.lead_id)) followPor.set(e.lead_id, new Date(e.created_at).getTime());
  let respostasAposFollowup = 0;
  for (const [lead, t] of respondeuEm) if ((followPor.get(lead) ?? Infinity) < t) respostasAposFollowup++;

  const mapa = Array.from({ length: 7 }, () => Array(8).fill(0) as number[]);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", hour12: false });
  const DIAS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const e of evP) {
    if (e.type !== "email_opened" && e.type !== "email_replied" && e.type !== "email_clicked") continue;
    const partes = fmt.formatToParts(new Date(e.created_at));
    const d = DIAS_EN.indexOf(partes.find((p) => p.type === "weekday")?.value ?? "");
    const h = Number(partes.find((p) => p.type === "hour")?.value ?? 0) % 24;
    if (d >= 0) mapa[d][Math.floor(h / 3)] += e.type === "email_replied" ? 3 : 1; // resposta pesa mais
  }
  let melhor: Relatorio["email"]["melhor"] = null;
  let pico = 0;
  mapa.forEach((linha, d) =>
    linha.forEach((v, b) => {
      if (v > pico) (pico = v), (melhor = { dia: DIAS_SEMANA[d], hora: `${BLOCOS[b]}–${(b + 1) * 3}h` });
    }),
  );

  // ---------- segmento / cidade / porte ----------
  const cnpjs = [...new Set(coorte.map((l) => l.cnpj?.trim()).filter(Boolean) as string[])];
  const empresa = new Map<string, { cnae: string | null; size: string | null }>();
  for (let i = 0; i < cnpjs.length; i += 300) {
    const { data } = await db.from("companies").select("cnpj, cnae_main, size").in("cnpj", cnpjs.slice(i, i + 300));
    for (const c of data ?? []) empresa.set(String(c.cnpj).trim(), { cnae: c.cnae_main as string | null, size: c.size as string | null });
  }
  const codigos = [...new Set([...empresa.values()].map((e) => e.cnae).filter(Boolean) as string[])];
  const descricao = new Map<string, string>();
  if (codigos.length) {
    const { data } = await db.from("cnaes").select("code, description").in("code", codigos);
    for (const c of data ?? []) descricao.set(c.code as string, c.description as string);
  }
  const agrupar = (chave: (l: Lead) => string) => {
    const m = new Map<string, Grupo>();
    for (const l of coorte) {
      const k = chave(l);
      const g = m.get(k) ?? { nome: k, leads: 0, respostas: 0, reunioes: 0 };
      g.leads++;
      if (chegou.respondeu.has(l.id)) g.respostas++;
      if (chegou.reuniao.has(l.id)) g.reunioes++;
      m.set(k, g);
    }
    return [...m.values()].sort((a, b) => b.leads - a.leads || b.respostas - a.respostas).slice(0, 8);
  };
  const emp = (l: Lead) => empresa.get(l.cnpj?.trim() ?? "");
  const segmentos = agrupar((l) => {
    const c = emp(l)?.cnae;
    return c ? (descricao.get(c) ?? `CNAE ${c}`) : "Sem CNAE (cadastro manual)";
  });
  const cidades = agrupar((l) => l.place || "Sem cidade");
  const portes = agrupar((l) => SIZE_LABEL[emp(l)?.size ?? ""] ?? "Não informado");

  // ---------- score × resultado ----------
  const faixas = ["Quente", "Morno", "Frio"];
  const score: FaixaResultado[] = faixas.map((rotulo) => {
    const doGrupo = coorte.filter((l) => faixaScore(l.score).rotulo === rotulo);
    return {
      rotulo,
      cor: faixaScore(rotulo === "Quente" ? 90 : rotulo === "Morno" ? 60 : 10).cor,
      leads: doGrupo.length,
      respostas: doGrupo.filter((l) => chegou.respondeu.has(l.id)).length,
      reunioes: doGrupo.filter((l) => chegou.reuniao.has(l.id)).length,
    };
  });
  const media = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, v) => s + v, 0) / xs.length) : null);
  const scoreMedio = {
    responderam: media(coorte.filter((l) => chegou.respondeu.has(l.id)).map((l) => l.score)),
    naoResponderam: media(coorte.filter((l) => chegou.contatado.has(l.id) && !chegou.respondeu.has(l.id)).map((l) => l.score)),
  };

  return {
    periodo,
    kpis,
    serie,
    granularidade,
    funil,
    perdidos,
    maiorVazamento,
    email: {
      enviados: enviados.filter((e) => Number(e.payload?.step ?? 1) === 1).length,
      followups: enviados.filter((e) => Number(e.payload?.step) > 1).length,
      abertos: ids("email_opened").size,
      cliques: ids("email_clicked").size,
      respondidos: respondeuEm.size,
      respostasAposFollowup,
      mapa,
      melhor,
    },
    segmentos,
    cidades,
    portes,
    score,
    scoreMedio,
  };
}

/** Relatório em CSV (seções separadas por linha em branco; ; como separador para o Excel BR). */
export function relatorioCsv(r: Relatorio) {
  const q = (v: string | number) => {
    const s = typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",")) : v;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas: (string | number)[][] = [
    ["Relatório Oraklo", r.periodo.rotulo],
    [],
    ["Indicador", "Período", "Período anterior"],
    ...r.kpis.map((k) => [k.rotulo, k.valor, k.anterior]),
    [],
    ["Funil (leads que entraram no período)", "Leads", "Conversão da etapa anterior (%)"],
    ...r.funil.map((f) => [f.rotulo, f.valor, f.conversao ?? ""]),
    ["Sem interesse", r.perdidos, ""],
    [],
    ["E-mails", "Total"],
    ["Enviados", r.email.enviados],
    ["Follow-ups", r.email.followups],
    ["Abertos", r.email.abertos],
    ["Cliques", r.email.cliques],
    ["Responderam", r.email.respondidos],
    ["Responderam depois do follow-up", r.email.respostasAposFollowup],
    [],
    [`Atividade por ${r.granularidade}`, "Contatados", "Respostas", "Reuniões", "E-mails enviados", "Aberturas"],
    ...r.serie.map((b) => [b.rotulo, b.contatados, b.respostas, b.reunioes, b.enviados, b.abertos]),
  ];
  for (const [titulo, grupos] of [
    ["Segmento", r.segmentos],
    ["Cidade", r.cidades],
    ["Porte", r.portes],
  ] as const) {
    linhas.push([], [titulo, "Leads", "Responderam", "Reuniões", "Taxa de resposta (%)"]);
    for (const g of grupos) linhas.push([g.nome, g.leads, g.respostas, g.reunioes, g.leads ? (g.respostas / g.leads) * 100 : 0]);
  }
  linhas.push([], ["Score", "Leads", "Responderam", "Reuniões"], ...r.score.map((s) => [s.rotulo, s.leads, s.respostas, s.reunioes]));
  return "﻿" + linhas.map((l) => l.map(q).join(";")).join("\r\n");
}
