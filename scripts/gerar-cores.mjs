// Gera app/cores.css (tema do Tailwind) a partir de lib/colors.ts, a fonte única das cores.
// Roda sozinho antes do `npm run dev` e do `npm run build`; à mão: `npm run cores`.
// Lê o arquivo como texto (sem executar TypeScript), então funciona em qualquer versão do Node.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const raiz = new URL("../", import.meta.url);
const fonte = readFileSync(new URL("lib/colors.ts", raiz), "utf8");

const ini = fonte.indexOf("export const cores = {");
const fim = fonte.indexOf("} as const;", ini);
if (ini < 0 || fim < 0) throw new Error("lib/colors.ts: não achei o objeto `cores`.");

const linhas = [];
const vistos = new Set();
for (const m of fonte.slice(ini, fim).matchAll(/^\s*"?([a-z0-9-]+)"?\s*:\s*"(#[0-9a-fA-F]{3,8}|oklch\([^)"]*\))"/gm)) {
  const [, nome, valor] = m;
  if (vistos.has(nome)) throw new Error(`lib/colors.ts: a cor "${nome}" aparece duas vezes.`);
  vistos.add(nome);
  linhas.push(`  --color-${nome}: ${valor.toLowerCase()};`);
}
if (!linhas.length) throw new Error("lib/colors.ts: nenhuma cor encontrada.");

const css = `/* Gerado por scripts/gerar-cores.mjs a partir de lib/colors.ts. Não edite aqui: mude as cores em lib/colors.ts. */
@theme {
${linhas.join("\n")}
}
`;
const destino = new URL("app/cores.css", raiz);
let atual = "";
try {
  atual = readFileSync(destino, "utf8");
} catch {}
if (atual !== css) writeFileSync(destino, css);
console.log(`cores: ${linhas.length} cores → ${fileURLToPath(destino)}`);
