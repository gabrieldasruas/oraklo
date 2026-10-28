// Importa da base aberta de CNPJ da Receita só as empresas dos nichos cadastrados.
//
// Uso: npm run import:receita [-- --periodo=2026-10] [-- --manter-zips]
//
// Fluxo: Cnaes e Municipios → Estabelecimentos (filtra por nicho, só ativas; conta filiais de todas) →
// Empresas (descarta empresário individual) e Socios → RNTRC da ANTT (se houver transporte de cargas)
// → upsert no banco → recompute_niches().
// Os zips são baixados um por vez (com retomada) e apagados após o uso, salvo --manter-zips.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import yauzl from "yauzl";

const SHARE_TOKEN = process.env.RECEITA_SHARE_TOKEN ?? "gn672Ad4CF8N6TK";
const DAV_BASE = "https://arquivos.receitafederal.gov.br/public.php/webdav/Dados/Cadastros/CNPJ";
const CACHE_DIR = process.env.RECEITA_CACHE_DIR ?? path.join(os.tmpdir(), "prospecta-receita");
const AUTH = "Basic " + Buffer.from(`${SHARE_TOKEN}:`).toString("base64");

// Número de colunas de cada arquivo (dicionário de dados da Receita). Linha diferente = layout mudou.
const COLUMNS = { Estabelecimentos: 30, Empresas: 7, Socios: 11, Cnaes: 2, Municipios: 2 } as const;
const PORTE: Record<string, string> = { "00": "NAO_INFORMADO", "01": "ME", "03": "EPP", "05": "DEMAIS" };
const SOCIO_KIND: Record<string, string> = { "1": "PJ", "2": "PF", "3": "ESTRANGEIRO" };
// Empresário individual (inclui o MEI): fora de todos os nichos, quase sempre autônomo sem estrutura.
const EXCLUDED_NATURES = new Set(["2135"]);
// Registro de transportadores da ANTT (dados abertos, CSV mensal).
const RNTRC_PACKAGE = "https://dados.antt.gov.br/api/3/action/package_show?id=b4a055d1-97a2-46f1-9461-cb17fbc6b6b3";
const RNTRC_CNAE_PREFIX = "4930"; // transporte rodoviário de cargas

// Os demais critérios do filtro (porte, natureza, capital, idade, matriz) são aplicados só no banco,
// em niche_companies(), para a busca poder afrouxá-los sobre a mesma base.
type NicheFilter = { cnaes?: string[]; ufs?: string[]; municipalities?: string[]; cnae_main_only?: boolean };
type Niche = { id: string; filter: NicheFilter };

const args = process.argv.slice(2);
const argPeriod = args.find((a) => a.startsWith("--periodo="))?.split("=")[1];
const keepZips = args.includes("--manter-zips");

const log = (msg: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);

// Download -----------------------------------------------------------------------

async function latestPeriod(): Promise<string> {
  const res = await fetch(`${DAV_BASE}/`, { method: "PROPFIND", headers: { Authorization: AUTH, Depth: "1" } });
  if (!res.ok) throw new Error(`PROPFIND falhou: HTTP ${res.status}`);
  const periods = [...(await res.text()).matchAll(/CNPJ\/(\d{4}-\d{2})\//g)].map((m) => m[1]).sort();
  if (!periods.length) throw new Error("Nenhuma competência encontrada no servidor da Receita");
  return periods[periods.length - 1];
}

async function download(period: string, file: string): Promise<string> {
  const dest = path.join(CACHE_DIR, period, file);
  if (fs.existsSync(dest)) return dest;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const part = dest + ".part";

  for (let attempt = 1; ; attempt++) {
    const have = fs.existsSync(part) ? fs.statSync(part).size : 0;
    try {
      const res = await fetch(`${DAV_BASE}/${period}/${file}`, {
        headers: { Authorization: AUTH, ...(have ? { Range: `bytes=${have}-` } : {}) },
      });
      if (res.status === 416) break; // já baixado por inteiro
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const append = have > 0 && res.status === 206;
      const total = Number(res.headers.get("content-length") ?? 0) + (append ? have : 0);
      const out = fs.createWriteStream(part, { flags: append ? "a" : "w" });
      let done = append ? have : 0;
      let lastLog = Date.now();
      for await (const chunk of res.body) {
        if (!out.write(chunk)) await new Promise((r) => out.once("drain", r));
        done += chunk.length;
        if (Date.now() - lastLog > 15000) {
          log(`  ${file}: ${((done / total) * 100).toFixed(0)}% de ${(total / 1e6).toFixed(0)} MB`);
          lastLog = Date.now();
        }
      }
      await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
      break;
    } catch (err) {
      if (attempt >= 4) throw new Error(`Falha ao baixar ${file}: ${(err as Error).message}`);
      log(`  ${file}: erro (${(err as Error).message}), tentativa ${attempt + 1} em 10 s`);
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
  fs.renameSync(part, dest);
  return dest;
}

// Leitura ------------------------------------------------------------------------

// CSV da Receita: separador ';', campos entre aspas, Latin-1, sem cabeçalho.
function parseLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (line[i] === '"') {
      let value = "";
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { value += '"'; i += 2; continue; }
          i++;
          break;
        }
        value += line[i++];
      }
      fields.push(value);
      i++; // pula o ';'
    } else {
      const end = line.indexOf(";", i);
      const stop = end === -1 ? line.length : end;
      fields.push(line.slice(i, stop));
      i = stop + 1;
    }
  }
  return fields;
}

function openZipEntry(file: string): Promise<NodeJS.ReadableStream> {
  return new Promise((resolve, reject) => {
    yauzl.open(file, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) return reject(err);
      zip.once("entry", (entry: yauzl.Entry) =>
        zip.openReadStream(entry, (e, stream) => (e || !stream ? reject(e) : resolve(stream))),
      );
      zip.once("error", reject);
      zip.readEntry();
    });
  });
}

// Chama onLine para cada linha. `prefilter` recebe a linha crua e evita o parse das que não interessam.
async function readZip(
  file: string,
  kind: keyof typeof COLUMNS,
  onLine: (f: string[]) => void,
  prefilter?: (raw: string) => boolean,
): Promise<number> {
  const decoder = new TextDecoder("latin1");
  let rest = "";
  let lines = 0;
  const handle = (raw: string) => {
    if (!raw) return;
    lines++;
    if (prefilter && !prefilter(raw)) return;
    const f = parseLine(raw);
    if (f.length !== COLUMNS[kind]) {
      throw new Error(`${path.basename(file)} linha ${lines}: ${f.length} colunas, esperado ${COLUMNS[kind]}. O layout da Receita mudou?`);
    }
    onLine(f);
  };
  for await (const chunk of await openZipEntry(file)) {
    const text = rest + decoder.decode(chunk as Buffer, { stream: true });
    const parts = text.split("\n");
    rest = parts.pop() ?? "";
    for (const p of parts) handle(p.endsWith("\r") ? p.slice(0, -1) : p);
  }
  handle(rest + decoder.decode());
  return lines;
}

async function eachZip(period: string, prefix: string, onFile: (file: string) => Promise<void>) {
  const files = prefix === "Cnaes" || prefix === "Municipios" ? [`${prefix}.zip`] : [...Array(10).keys()].map((n) => `${prefix}${n}.zip`);
  for (const name of files) {
    log(`${name}: baixando`);
    const file = await download(period, name);
    log(`${name}: lendo`);
    await onFile(file);
    if (!keepZips) fs.rmSync(file);
  }
}

// Conversões ---------------------------------------------------------------------

const toDate = (s: string) => (/^\d{8}$/.test(s) && s !== "00000000" ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null);
const clean = (s: string) => s.trim().replace(/\s+/g, " ") || null;
const phone = (ddd: string, num: string) => (num.trim() ? `${ddd.trim()}${num.trim()}`.replace(/\D/g, "") : null);

function matches(niche: Niche, uf: string, municipality: string, main: string, secondary: string[]) {
  const f = niche.filter;
  if (f.ufs && !f.ufs.includes(uf)) return false;
  if (f.municipalities && !f.municipalities.includes(municipality)) return false;
  if (f.cnaes && !f.cnaes.includes(main) && (f.cnae_main_only || !secondary.some((c) => f.cnaes!.includes(c)))) return false;
  return true;
}

// RNTRC --------------------------------------------------------------------------

type Rntrc = { category: string; status: string; equiparado: boolean };

// Baixa o CSV mais recente do RNTRC (cache por arquivo) e devolve o registro de cada empresa, pelo
// CNPJ exato ou por outro estabelecimento da mesma raiz (o ativo tem preferência).
// Só linhas com CNPJ: o CPF do autônomo pessoa física não é lido.
async function readRntrc(cnpjs: Set<string>, roots: Set<string>) {
  const pkg = await (await fetch(RNTRC_PACKAGE)).json();
  const csv = (pkg.result.resources as { format: string; created: string; url: string }[])
    .filter((r) => r.format === "CSV")
    .sort((a, b) => a.created.localeCompare(b.created))
    .at(-1);
  if (!csv) throw new Error("Nenhum CSV do RNTRC encontrado na ANTT");
  const dest = path.join(CACHE_DIR, "rntrc", path.basename(new URL(csv.url).pathname));
  if (!fs.existsSync(dest)) {
    log(`RNTRC: baixando ${path.basename(dest)}`);
    const res = await fetch(csv.url);
    if (!res.ok || !res.body) throw new Error(`RNTRC: HTTP ${res.status}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await fs.promises.writeFile(dest + ".part", res.body);
    fs.renameSync(dest + ".part", dest);
  }
  log(`RNTRC: lendo ${path.basename(dest)}`);
  // nome;rntrc;primeiro_cadastro;situacao;cpf_cnpj;categoria;cep;municipio;uf;equiparado;data_situacao (Latin-1, com cabeçalho)
  const byCnpj = new Map<string, Rntrc>();
  const byRoot = new Map<string, Rntrc>();
  const decoder = new TextDecoder("latin1");
  let rest = "";
  let header = true;
  const handle = (raw: string) => {
    if (header) return void (header = false);
    const f = parseLine(raw);
    const doc = (f[4] ?? "").replace(/\D/g, "");
    const root = doc.slice(0, 8);
    if (doc.length !== 14 || !roots.has(root)) return;
    const reg = { category: f[5], status: f[3], equiparado: f[9] === "Sim" };
    if (cnpjs.has(doc)) byCnpj.set(doc, reg);
    if (!byRoot.has(root) || reg.status === "ATIVO") byRoot.set(root, reg);
  };
  for await (const chunk of fs.createReadStream(dest)) {
    const parts = (rest + decoder.decode(chunk as Buffer, { stream: true })).split("\n");
    rest = parts.pop() ?? "";
    for (const p of parts) handle(p.endsWith("\r") ? p.slice(0, -1) : p);
  }
  if (rest) handle(rest + decoder.decode());
  log(`RNTRC: ${byCnpj.size.toLocaleString("pt-BR")} empresas com registro próprio, ${byRoot.size.toLocaleString("pt-BR")} raízes`);
  return { byCnpj, byRoot };
}

// Principal ----------------------------------------------------------------------

const db = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await db.connect();

try {
  const period = argPeriod ?? (await latestPeriod());
  log(`Competência ${period}, cache em ${CACHE_DIR}`);

  const niches: Niche[] = (await db.query("select id, filter from public.niches")).rows;
  if (!niches.length) throw new Error("Nenhum nicho cadastrado: não há o que importar");
  // Porte vem de Empresas, então o filtro de sizes só é aplicado no fim (recompute_niches).
  const allCnaes = [...new Set(niches.flatMap((n) => n.filter.cnaes ?? []))];
  const hasNicheWithoutCnae = niches.some((n) => !n.filter.cnaes);
  const perNicheInFile = new Map<string, number>(niches.map((n) => [n.id, 0]));

  // 1. Tabelas de referência
  const cnaes: { code: string; description: string }[] = [];
  await eachZip(period, "Cnaes", async (f) => { await readZip(f, "Cnaes", ([code, description]) => cnaes.push({ code, description })); });
  const municipalities: { code: string; name: string }[] = [];
  await eachZip(period, "Municipios", async (f) => { await readZip(f, "Municipios", ([code, name]) => municipalities.push({ code, name })); });

  // 2. Estabelecimentos ativos que casam com algum nicho
  type Company = Record<string, unknown> & { cnpj: string; cnpj_root: string };
  const companies = new Map<string, Company>();
  // Estabelecimentos ativos por raiz (cnpj_basico), de todas as empresas do Brasil: 1 byte por raiz possível.
  const establishments = new Uint8Array(100_000_000);
  await eachZip(period, "Estabelecimentos", async (file) => {
    const lines = await readZip(
      file,
      "Estabelecimentos",
      (f) => {
        if (f[5] !== "02") return; // só ativas
        const uf = f[19], municipality = f[20], main = f[11];
        const secondary = f[12] ? f[12].split(",").filter(Boolean) : [];
        const hits = niches.filter((n) => matches(n, uf, municipality, main, secondary));
        if (!hits.length) return;
        for (const n of hits) perNicheInFile.set(n.id, perNicheInFile.get(n.id)! + 1);
        const cnpj = f[0] + f[1] + f[2];
        companies.set(cnpj, {
          cnpj,
          cnpj_root: f[0],
          trade_name: clean(f[4]),
          is_headquarters: f[3] === "1",
          status: f[5],
          status_since: toDate(f[6]),
          opened_at: toDate(f[10]),
          cnae_main: main || null,
          cnae_secondary: secondary,
          uf,
          municipality_code: f[20] || null,
          district: clean(f[17]),
          zip: f[18].replace(/\D/g, "") || null,
          address: clean([`${f[13]} ${f[14]}`.trim(), f[15], f[16]].filter((s) => s.trim()).join(", ")),
          receita_email: f[27].trim().toLowerCase() || null,
          receita_phones: [phone(f[21], f[22]), phone(f[23], f[24])].filter(Boolean),
        });
      },
      (raw) => {
        // Situação sem o parse completo: vem logo após o nome fantasia, o primeiro campo de texto livre.
        const end = raw.indexOf('";"', 28);
        if (raw.slice(end + 3, end + 5) === "02") {
          const root = Number(raw.slice(1, 9));
          if (establishments[root] < 255) establishments[root]++;
        }
        return hasNicheWithoutCnae || allCnaes.some((c) => raw.includes(c));
      },
    );
    log(`  ${lines.toLocaleString("pt-BR")} linhas, ${companies.size.toLocaleString("pt-BR")} empresas selecionadas até agora`);
  });
  let roots = new Set([...companies.values()].map((c) => c.cnpj_root));

  // 3. Empresas: razão social, porte, capital, natureza jurídica
  const companyData = new Map<string, Record<string, unknown>>();
  const excludedRoots = new Set<string>();
  await eachZip(period, "Empresas", async (file) => {
    await readZip(
      file,
      "Empresas",
      (f) => EXCLUDED_NATURES.has(f[2]) ? excludedRoots.add(f[0]) : companyData.set(f[0], {
        legal_name: clean(f[1].replace(/\s*\d{11}\s*$/, "")), // razão social de MEI termina com o CPF (LGPD)
        legal_nature: f[2] || null,
        share_capital: f[4] ? Number(f[4].replace(/\./g, "").replace(",", ".")) : null,
        size: PORTE[f[5]] ?? "NAO_INFORMADO",
      }),
      (raw) => roots.has(raw.slice(1, 9)),
    );
  });
  for (const [cnpj, c] of companies) if (excludedRoots.has(c.cnpj_root)) companies.delete(cnpj);
  roots = new Set([...companies.values()].map((c) => c.cnpj_root));
  log(`${excludedRoots.size.toLocaleString("pt-BR")} empresários individuais descartados, ${companies.size.toLocaleString("pt-BR")} empresas seguem`);

  // 4. Sócios (sem CPF/CNPJ do sócio)
  const partners: Record<string, unknown>[] = [];
  await eachZip(period, "Socios", async (file) => {
    await readZip(
      file,
      "Socios",
      (f) => partners.push({
        cnpj_root: f[0],
        name: clean(f[2]),
        kind: SOCIO_KIND[f[1]] ?? null,
        role: f[4] || null,
        entered_at: toDate(f[5]),
        age_range: f[10] || null,
      }),
      (raw) => roots.has(raw.slice(1, 9)),
    );
  });

  // 5. RNTRC (ANTT), só se houver transportadora de cargas
  const rntrc = [...companies.values()].some((c) => String(c.cnae_main).startsWith(RNTRC_CNAE_PREFIX))
    ? await readRntrc(new Set(companies.keys()), roots)
    : null;

  // 6. Gravação, tudo numa transação
  const rows = [...companies.values()].map((c) => {
    const r = rntrc?.byCnpj.get(c.cnpj) ?? rntrc?.byRoot.get(c.cnpj_root);
    return {
      ...c,
      ...companyData.get(c.cnpj_root),
      establishments: establishments[Number(c.cnpj_root)] || 1,
      rntrc_category: r?.category ?? null,
      rntrc_status: r?.status ?? null,
      rntrc_equiparado: r ? r.equiparado : null,
      source_period: period,
    };
  });
  log(`Gravando ${rows.length} empresas e ${partners.length} sócios`);
  const batches = <T,>(list: T[], size = 1000) => [...Array(Math.ceil(list.length / size)).keys()].map((i) => list.slice(i * size, (i + 1) * size));

  await db.query("begin");
  for (const b of batches(cnaes)) {
    await db.query(
      `insert into public.cnaes (code, description)
       select code, description from jsonb_to_recordset($1) as x(code text, description text)
       on conflict (code) do update set description = excluded.description`,
      [JSON.stringify(b)],
    );
  }
  for (const b of batches(municipalities)) {
    await db.query(
      `insert into public.municipalities (code, name)
       select code, name from jsonb_to_recordset($1) as x(code text, name text)
       on conflict (code) do update set name = excluded.name`,
      [JSON.stringify(b)],
    );
  }
  for (const b of batches(rows)) {
    await db.query(
      `insert into public.companies (
         cnpj, cnpj_root, legal_name, trade_name, is_headquarters, status, status_since, opened_at,
         cnae_main, cnae_secondary, uf, municipality_code, district, zip, address, size, share_capital,
         legal_nature, receita_email, receita_phones, establishments, rntrc_category, rntrc_status,
         rntrc_equiparado, source_period, updated_at)
       select cnpj, cnpj_root, legal_name, trade_name, is_headquarters, status, status_since, opened_at,
         cnae_main, cnae_secondary, uf, municipality_code, district, zip, address, size, share_capital,
         legal_nature, receita_email, receita_phones, establishments, rntrc_category, rntrc_status,
         rntrc_equiparado, source_period, now()
       from jsonb_to_recordset($1) as x(
         cnpj text, cnpj_root text, legal_name text, trade_name text, is_headquarters boolean, status text,
         status_since date, opened_at date, cnae_main text, cnae_secondary text[], uf text,
         municipality_code text, district text, zip text, address text, size text, share_capital numeric,
         legal_nature text, receita_email text, receita_phones text[], establishments smallint,
         rntrc_category text, rntrc_status text, rntrc_equiparado boolean, source_period text)
       on conflict (cnpj) do update set
         cnpj_root = excluded.cnpj_root, legal_name = excluded.legal_name, trade_name = excluded.trade_name,
         is_headquarters = excluded.is_headquarters, status = excluded.status, status_since = excluded.status_since,
         opened_at = excluded.opened_at, cnae_main = excluded.cnae_main, cnae_secondary = excluded.cnae_secondary,
         uf = excluded.uf, municipality_code = excluded.municipality_code, district = excluded.district,
         zip = excluded.zip, address = excluded.address, size = excluded.size, share_capital = excluded.share_capital,
         legal_nature = excluded.legal_nature, receita_email = excluded.receita_email,
         receita_phones = excluded.receita_phones, establishments = excluded.establishments,
         rntrc_category = excluded.rntrc_category, rntrc_status = excluded.rntrc_status,
         rntrc_equiparado = excluded.rntrc_equiparado, source_period = excluded.source_period, updated_at = now()`,
      [JSON.stringify(b)],
    );
  }
  await db.query("delete from public.partners where cnpj_root = any($1)", [[...roots]]);
  for (const b of batches(partners)) {
    await db.query(
      `insert into public.partners (cnpj_root, name, kind, role, entered_at, age_range)
       select cnpj_root, name, kind, role, entered_at, age_range
       from jsonb_to_recordset($1) as x(cnpj_root text, name text, kind text, role text, entered_at date, age_range text)`,
      [JSON.stringify(b)],
    );
  }
  // UF dos municípios vem dos estabelecimentos
  await db.query(
    `update public.municipalities m set uf = c.uf
     from (select distinct municipality_code, uf from public.companies) c
     where m.code = c.municipality_code and m.uf is distinct from c.uf`,
  );
  // Empresas não tocadas nesta execução (saíram da Receita, do escopo dos nichos ou são empresário individual): não apaga
  // (pode haver leads ligados), só marca. now() é o início da transação, igual ao updated_at do upsert.
  const gone = await db.query(
    "update public.companies set status = 'fora_da_base' where updated_at < now() and status <> 'fora_da_base'",
  );
  await db.query("select public.recompute_niches()");
  await db.query("commit");

  // 7. Conferência: contagem no arquivo × contagem calculada no banco
  log(`Concluído. ${gone.rowCount} empresas marcadas como fora_da_base.`);
  const counts = (await db.query("select id, companies_count from public.niches order by id")).rows;
  for (const { id, companies_count } of counts) {
    // arquivo = casou com CNAE/UF/município; nicho = após os demais critérios aplicados no banco
    log(`  ${id}: arquivo=${perNicheInFile.get(id)} nicho=${companies_count}`);
  }
} catch (err) {
  await db.query("rollback").catch(() => {});
  console.error(err);
  process.exitCode = 1;
} finally {
  await db.end();
}
