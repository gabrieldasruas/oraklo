// Todas as cores do Oraklo ficam aqui. Mudou aqui, muda no site inteiro.
//
// Como funciona:
// - Cada nome vira uma classe do Tailwind e uma variável CSS: `neon` → `bg-neon`, `text-neon`, `var(--color-neon)`.
// - O script `scripts/gerar-cores.mjs` lê este arquivo e escreve `app/cores.css` (roda sozinho antes do `dev` e do `build`).
// - Em código (canvas, 3D, mapa, e-mail), importe `cores` ou use `comAlfa(cores.neon, 0.5)`.
// - Nunca escreva um hex ou rgba direto num componente: crie (ou reaproveite) um nome aqui.
// - Modo escuro: `coresEscuras` troca só os valores que mudam; `ilhasTemaOriginal` lista os elementos
//   de fundo colorido fixo que mantêm as cores originais (botão neon, WhatsApp, auras...).

export const cores = {
  // ---------- marca ----------
  branco: "#ffffff", // sempre branco (canvas, SVG); para superfícies use `white`
  preto: "#000000",
  white: "#ffffff", // superfícies e texto claro: muda no modo escuro
  sombra: "#0b0b0c", // cor das sombras: igual nos dois temas
  night: "#0b0b0c",
  neon: "#b8ff3c",
  "neon-claro": "#c8ff63", // hover dos botões neon
  "neon-escuro": "#84cc16", // sombra dos botões neon
  canvas: "#e7e7ea",
  ink: "#0b1220",
  muted: "#5b6475",
  line: "#e6e8ee",
  surface: "#f5f6f9",
  brand: "#4338ca",
  "brand-dark": "#3730a3",
  "brand-soft": "#eef0ff",

  // ---------- superfícies (gavetas, modais, slides) ----------
  papel: "#f4f4f1",
  "papel-frio": "#f4f4f6",
  "papel-cinza": "#eeeef0",
  "papel-previa": "#f6f6f8",
  "papel-slide": "#e9e9ec",
  "papel-creme": "#f1efe6",
  "verde-noite": "#0f120b", // fundo do perfil de cliente ideal

  // ---------- estados ----------
  // escalas em OKLCH: os mesmos valores das cores do Tailwind 4 usadas antes (rose, emerald, amber, sky)
  good: "#059669",
  "good-soft": "#e7f8f1",
  "good-600": "oklch(59.6% 0.145 163.225)",
  "good-700": "oklch(50.8% 0.118 165.612)",
  warn: "#b45309",
  "warn-soft": "#fef3e2",
  "warn-50": "oklch(98.7% 0.022 95.277)",
  "warn-300": "oklch(87.9% 0.169 91.605)",
  "warn-400": "oklch(82.8% 0.189 84.429)",
  "warn-900": "oklch(41.4% 0.112 45.904)",
  danger: "oklch(58.6% 0.253 17.585)",
  "danger-50": "oklch(96.9% 0.015 12.422)",
  "danger-100": "oklch(94.1% 0.03 12.58)",
  "danger-300": "oklch(81% 0.117 11.638)",
  "danger-400": "oklch(71.2% 0.194 13.428)",
  "danger-500": "oklch(64.5% 0.246 16.439)",
  "danger-600": "oklch(58.6% 0.253 17.585)",
  "danger-700": "oklch(51.4% 0.222 16.935)",
  "danger-800": "oklch(45.5% 0.188 13.697)",
  "danger-900": "oklch(41% 0.159 10.272)",
  "info-400": "oklch(74.6% 0.16 232.661)",
  "info-500": "oklch(68.5% 0.169 237.323)",

  // ---------- etapas do funil ----------
  "etapa-novo": "#a1a1aa",
  "etapa-sequencia": "#38bdf8",
  "etapa-respondeu": "#fbbf24",
  "etapa-reuniao": "#b8ff3c",
  "etapa-sem-interesse": "#fb7185",

  // ---------- score ----------
  "score-quente": "#b8ff3c",
  "score-morno": "#ffd08a",
  "score-frio": "#d8d8de",

  // ---------- porte (gráfico de capital) ----------
  "porte-me": "#b8ff3c",
  "porte-epp": "#ffb547",
  "porte-demais": "#8fa8ff",

  // ---------- categorias de reunião (fundo, borda, texto) ----------
  "reuniao-prospeccao": "#e4fa8a",
  "reuniao-prospeccao-borda": "#9cc41a",
  "reuniao-prospeccao-texto": "#3d5c00",
  "reuniao-reuniao": "#d8d0ff",
  "reuniao-reuniao-borda": "#8f7cff",
  "reuniao-reuniao-texto": "#3b2f8f",
  "reuniao-followup": "#bdeedc",
  "reuniao-followup-borda": "#3fb994",
  "reuniao-followup-texto": "#0f5c45",
  "reuniao-proposta": "#ffd08a",
  "reuniao-proposta-borda": "#f0a030",
  "reuniao-proposta-texto": "#7a4500",
  "reuniao-interno": "#e2e2e6",
  "reuniao-interno-borda": "#9a9aa3",
  "reuniao-interno-texto": "#3a3a40",
  "agenda-faixa-1": "#ecffb0",
  "agenda-faixa-2": "#f3f6e8",
  "agenda-faixa-3": "#ebe6ff",
  "agenda-faixa-4": "#dcd4ff",

  // ---------- portfólio (cores que o cliente escolhe) ----------
  "portfolio-amarelo": "#ffe14d",
  "portfolio-ciano": "#7ee8fa",
  "portfolio-lilas": "#c9b6ff",
  "portfolio-coral": "#ff9a7a",

  // ---------- marcas de terceiros ----------
  whatsapp: "#25d366",
  "whatsapp-escuro": "#075e54",
  "whatsapp-teal": "#00a884",
  "whatsapp-bolha": "#d9fdd3",
  "whatsapp-fundo": "#efeae2",
  "whatsapp-barra": "#f0f0f0",
  "whatsapp-lido": "#53bdeb",
  "whatsapp-mata": "#0b2a1f", // seção de modelos de WhatsApp
  "whatsapp-mata-escura": "#071d15",
  linkedin: "#0a66c2",
  rd: "#1b2b5b",
  "google-azul": "#4285f4",
  "google-verde": "#34a853",
  "google-amarelo": "#fbbc05",
  "google-vermelho": "#ea4335",

  // ---------- auras (fundos coloridos dos cards) ----------
  "aura-lime-1": "#e4fa8a",
  "aura-lime-2": "#55d08b",
  "aura-lime": "#bfe98a",
  "aura-sun-1": "#ffe680",
  "aura-sun-2": "#ff8f5a",
  "aura-sun": "#ffd08a",
  "aura-coral-1": "#ffb08f",
  "aura-coral-2": "#ff5f86",
  "aura-coral": "#ff9a9a",
  "aura-mint-1": "#b6f6e0",
  "aura-mint-2": "#62cfe6",
  "aura-mint": "#bdeedc",
  "aura-lilac-1": "#e6d9ff",
  "aura-lilac-2": "#9fb2ff",
  "aura-lilac": "#d8d0ff",
  "aura-azul": "#788cff", // brilho azul do fundo escuro
  "aura-pessego": "#ff966e", // brilho laranja do fundo do painel
  "aura-ceu": "#a0beff",
  "brilho-creme": "#f4ffd6", // reflexo do botão neon

  // ---------- logo (lupa) ----------
  "logo-aro-1": "#fbfff0",
  "logo-aro-2": "#d6ff8a",
  "logo-aro-3": "#5f8f12",
  "logo-aro-4": "#1b2408",
  "logo-aro-5": "#f2ffd1",
  "logo-lente-1": "#bdf3ff",
  "logo-lente-2": "#c9b6ff",
  "logo-lente-3": "#ffc2e4",
  "logo-lente-4": "#7ee8fa",
  "logo-cabo-1": "#5b5d68",
  "logo-cabo-2": "#24252b",
  "logo-neon-fundo": "#3d5c00",

  // ---------- pasta do Oraklo (segmentação) ----------
  "pasta-1": "#f3ffd8",
  "pasta-2": "#d6ff7a",
  "pasta-3": "#9fd52a",
  "pasta-aba-1": "#bfe854",
  "pasta-aba-2": "#8fc21f",
  "pasta-frente-1": "#fbfff2",
  "pasta-frente-2": "#d9ff8a",
  "pasta-frente-3": "#6f9a16",
  "pasta-pontos": "#2f4a08",

  // ---------- página inicial (esferas, pontos, título) ----------
  "esfera-prata-1": "#d4d4d8",
  "esfera-prata-2": "#3f3f46",
  "esfera-agua-1": "#5eead4",
  "esfera-agua-2": "#065f46",
  "esfera-lima-1": "#d9f99d",
  "esfera-lima-2": "#4d7c0f",
  "esfera-sombra": "#050505",
  "matriz-ponto": "#f4f4f5",
  "matriz-base": "#f4fff5",
  "pontos-onda": "#78be14",
  "intro-ponto": "#bfe98a",
  "particula-clara": "#e9ffd0",

  // ---------- cenas 3D dos nichos (tom claro e escuro de cada aura) ----------
  "cena-lime-1": "#7fbf1a",
  "cena-lime-2": "#b8ff3c",
  "cena-sun-1": "#ff8f5a",
  "cena-sun-2": "#ffd166",
  "cena-mint-1": "#2bb3a3",
  "cena-mint-2": "#7ff0c9",
  "cena-lilac-1": "#7a6cff",
  "cena-lilac-2": "#c9b8ff",
  "cena-coral-1": "#ff5f86",
  "cena-coral-2": "#ffb08f",
  "cena-night-1": "#0b0b0c",
  "cena-night-2": "#4b5563",
} as const;

/**
 * Modo escuro: novos valores das cores que mudam. No escuro, `night` (texto e bordas) fica claro
 * e `white` (cards e superfícies) fica escuro; o resto do site acompanha sozinho.
 */
export const coresEscuras = {
  white: "#17181b",
  night: "#eeeeec",
  canvas: "#0d0e10",
  ink: "#e9ebef",
  muted: "#9aa3b2",
  line: "#2a2d33",
  surface: "#16171a",
  "brand-soft": "#1d1f3a",
  "good-soft": "#0f2a20",
  "warn-soft": "#2d2112",
  papel: "#141517",
  "papel-frio": "#141518",
  "papel-cinza": "#16171a",
  "papel-previa": "#17181b",
  "good-600": "oklch(72% 0.15 163)",
  "good-700": "oklch(78% 0.13 165)",
  "warn-50": "oklch(27% 0.04 85)",
  "warn-900": "oklch(88% 0.1 90)",
  "danger-50": "oklch(26% 0.05 15)",
  "danger-100": "oklch(30% 0.07 15)",
  "danger-700": "oklch(78% 0.13 15)",
  "danger-800": "oklch(82% 0.1 15)",
  "danger-900": "oklch(86% 0.08 15)",
} as const;

/**
 * Elementos de fundo colorido fixo: no modo escuro continuam com as cores originais
 * (senão o texto escuro do botão neon, por exemplo, ficaria claro). São nomes de classe; `hover:` vale ao passar o mouse.
 * Para qualquer outro elemento, use a classe `tema-original`.
 */
export const ilhasTemaOriginal = [
  "tema-original",
  "bg-night",
  "hover:bg-night",
  "bg-neon",
  "hover:bg-neon",
  "bg-whatsapp",
  "!bg-whatsapp",
  "bg-whatsapp-escuro",
  "bg-whatsapp-teal",
  "bg-whatsapp-mata",
  "bg-whatsapp-mata-escura",
  "bg-whatsapp-fundo",
  "bg-rd",
  "bg-linkedin",
  "!bg-linkedin",
  "bg-verde-noite",
  "bg-danger-500",
  "bg-danger-600",
  "aura-lime",
  "aura-sun",
  "aura-coral",
  "aura-mint",
  "aura-lilac",
  "aura-night",
];

/** Cor como CSS que acompanha o tema: corCss("night", 0.16) → "color-mix(in srgb, var(--color-night) 16%, transparent)". */
export function corCss(nome: NomeCor | keyof typeof coresEscuras, alfa?: number): string {
  if (alfa === undefined || alfa >= 1) return `var(--color-${nome})`;
  return `color-mix(in srgb, var(--color-${nome}) ${Math.round(alfa * 1000) / 10}%, transparent)`;
}

export type NomeCor = keyof typeof cores;

/** "#b8ff3c" → [184, 255, 60]. Só para cores em hex (as escalas em OKLCH são para CSS). */
export function rgbDe(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Cor com transparência para usar em código: comAlfa(cores.neon, 0.5) → "rgba(184,255,60,0.5)". */
export function comAlfa(hex: string, alfa: number): string {
  const [r, g, b] = rgbDe(hex);
  return `rgba(${r},${g},${b},${alfa})`;
}

/** Mistura duas cores (t = 0 → a, t = 1 → b), útil em animações de canvas. */
export function misturar(a: string, b: string, t: number, alfa = 1): string {
  const [r1, g1, b1] = rgbDe(a);
  const [r2, g2, b2] = rgbDe(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgba(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)},${alfa})`;
}
