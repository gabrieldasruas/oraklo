// Gera app/cores.css (tema do Tailwind + modo escuro) a partir de lib/colors.ts, a fonte única das cores.
// Roda sozinho antes do `npm run dev` e do `npm run build`; à mão: `npm run cores`.
// Lê o arquivo como texto (sem executar TypeScript), então funciona em qualquer versão do Node.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const raiz = new URL("../", import.meta.url);
const fonte = readFileSync(new URL("lib/colors.ts", raiz), "utf8");

/** Lê um objeto `export const nome = { "chave": "valor", ... }` do arquivo. */
function objeto(nome) {
  const ini = fonte.indexOf(`export const ${nome} = {`);
  const fim = fonte.indexOf("} as const;", ini);
  if (ini < 0 || fim < 0) throw new Error(`lib/colors.ts: não achei o objeto \`${nome}\`.`);
  const mapa = new Map();
  for (const m of fonte.slice(ini, fim).matchAll(/^\s*"?([a-z0-9-]+)"?\s*:\s*"(#[0-9a-fA-F]{3,8}|oklch\([^)"]*\))"/gm)) {
    const [, chave, valor] = m;
    if (mapa.has(chave)) throw new Error(`lib/colors.ts: a cor "${chave}" aparece duas vezes em ${nome}.`);
    mapa.set(chave, valor.toLowerCase());
  }
  if (!mapa.size) throw new Error(`lib/colors.ts: nenhuma cor em ${nome}.`);
  return mapa;
}

/** Lê a lista de classes `export const ilhasTemaOriginal = [ ... ]`. */
function lista(nome) {
  const ini = fonte.indexOf(`export const ${nome} = [`);
  const fim = fonte.indexOf("];", ini);
  if (ini < 0 || fim < 0) throw new Error(`lib/colors.ts: não achei a lista \`${nome}\`.`);
  return [...fonte.slice(ini, fim).matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const cores = objeto("cores");
const escuras = objeto("coresEscuras");
for (const k of escuras.keys()) if (!cores.has(k)) throw new Error(`lib/colors.ts: "${k}" está em coresEscuras mas não em cores.`);

// classe do Tailwind → seletor CSS ("hover:bg-neon" → ".hover\:bg-neon:hover", "!bg-x" → ".\!bg-x")
const seletor = (classe) => {
  const hover = classe.startsWith("hover:");
  return "." + classe.replace(/[:!]/g, (c) => "\\" + c) + (hover ? ":hover" : "");
};
const ilhas = lista("ilhasTemaOriginal").map(seletor).join(",\n  ");
// ilhas de fundo claro (neon, auras pastel...): sem classe de texto, herdariam o texto claro do modo escuro
const claras = lista("ilhasTemaOriginal")
  .filter((c) => !/night|whatsapp(?!-fundo)|rd$|linkedin|verde-noite|danger/.test(c))
  .map(seletor)
  .join(", ");
const decl = (mapa) => [...mapa].map(([k, v]) => `  --color-${k}: ${v};`).join("\n");

const css = `/* Gerado por scripts/gerar-cores.mjs a partir de lib/colors.ts. Não edite aqui: mude as cores em lib/colors.ts. */
@theme {
${decl(cores)}
}

/* Modo escuro: vale dentro do painel (.tema-app) quando <html data-theme="dark">. */
:root[data-theme="dark"] .tema-app {
  color-scheme: dark;
${decl(escuras)}
}
:root[data-theme="dark"]:has(.tema-app) body {
  background: ${escuras.get("canvas")};
}

/* Fundos coloridos fixos mantêm as cores originais no modo escuro. */
:root[data-theme="dark"] .tema-app :is(
  ${ilhas}
) {
${decl(new Map([...escuras.keys()].map((k) => [k, cores.get(k)])))}
}

/* Fundos claros fixos: texto escuro por padrão (no layer base, então classes text-* ainda mandam). */
@layer base {
  :root[data-theme="dark"] .tema-app :is(${claras}) {
    color: var(--color-night);
  }
}

/* Cards escuros ganham um contorno sutil para não sumir no fundo escuro. */
:root[data-theme="dark"] .tema-app :is(.bg-night, .aura-night):not(:focus-visible) {
  outline: 1px solid color-mix(in srgb, ${cores.get("branco")} 12%, transparent);
  outline-offset: -1px;
}
`;

const destino = new URL("app/cores.css", raiz);
let atual = "";
try {
  atual = readFileSync(destino, "utf8");
} catch {}
if (atual !== css) writeFileSync(destino, css);
console.log(`cores: ${cores.size} cores, ${escuras.size} no modo escuro → ${fileURLToPath(destino)}`);
