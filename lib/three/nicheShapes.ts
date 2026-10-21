// Modelos 3D em partículas para cada segmento (mesmas chaves de ícone de content/app.ts).
// Cada modelo é montado com peças simples (caixas, cilindros, esferas, curvas), e os
// pontos são distribuídos pelas peças proporcionalmente ao "peso" de cada uma.
import { rng, type Shape } from "./shapes";

type V3 = [number, number, number];
type R = () => number;
type Part = { w: number; at: (r: R) => V3 };

const TAU = Math.PI * 2;

// ---------- peças ----------

/** Superfície de uma caixa centrada em c com tamanho s. */
const box = (c: V3, s: V3, w = 1): Part => ({
  w,
  at: (r) => {
    const p: V3 = [r() - 0.5, r() - 0.5, r() - 0.5];
    const f = Math.floor(r() * 3);
    p[f] = r() < 0.5 ? -0.5 : 0.5;
    return [c[0] + p[0] * s[0], c[1] + p[1] * s[1], c[2] + p[2] * s[2]];
  },
});

/** Cilindro (lateral + tampas). axis: 0=x, 1=y, 2=z. */
const cylinder = (c: V3, radius: number, len: number, axis: 0 | 1 | 2, w = 1): Part => ({
  w,
  at: (r) => {
    const a = r() * TAU;
    const cap = r() < 0.3;
    const rad = cap ? radius * Math.sqrt(r()) : radius;
    const h = cap ? (r() < 0.5 ? -0.5 : 0.5) * len : (r() - 0.5) * len;
    const u = Math.cos(a) * rad;
    const v = Math.sin(a) * rad;
    const p: V3 = axis === 0 ? [h, u, v] : axis === 1 ? [u, h, v] : [u, v, h];
    return [c[0] + p[0], c[1] + p[1], c[2] + p[2]];
  },
});

/** Toro (anel), no plano perpendicular ao eixo. */
const ring = (c: V3, R: number, tube: number, axis: 0 | 1 | 2, w = 1): Part => ({
  w,
  at: (r) => {
    const u = r() * TAU;
    const v = r() * TAU;
    const a = (R + tube * Math.cos(v)) * Math.cos(u);
    const b = (R + tube * Math.cos(v)) * Math.sin(u);
    const h = tube * Math.sin(v);
    const p: V3 = axis === 0 ? [h, a, b] : axis === 1 ? [a, h, b] : [a, b, h];
    return [c[0] + p[0], c[1] + p[1], c[2] + p[2]];
  },
});

/** Esfera (ou elipsoide) com escala por eixo; `top` limita a uma calota (y >= 0). */
const ball = (c: V3, s: V3, w = 1, top = false): Part => ({
  w,
  at: (r) => {
    const y = top ? r() : r() * 2 - 1;
    const rad = Math.sqrt(1 - y * y);
    const a = r() * TAU;
    return [c[0] + Math.cos(a) * rad * s[0], c[1] + y * s[1], c[2] + Math.sin(a) * rad * s[2]];
  },
});

/** Tubo fino ao longo de uma curva paramétrica t∈[0,1]. */
const tube = (f: (t: number) => V3, thick: number, w = 1): Part => ({
  w,
  at: (r) => {
    const [x, y, z] = f(r());
    return [x + (r() - 0.5) * thick, y + (r() - 0.5) * thick, z + (r() - 0.5) * thick];
  },
});

/** Segmento de reta (com espessura). */
const seg = (a: V3, b: V3, thick = 0.05, w = 1): Part =>
  tube((t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], thick, w);

/** Retângulo plano (no plano xy, deslocado em z). */
const plane = (c: V3, sx: number, sy: number, w = 1): Part => ({
  w,
  at: (r) => [c[0] + (r() - 0.5) * sx, c[1] + (r() - 0.5) * sy, c[2]],
});

function compose(n: number, parts: Part[], seed: number): Shape {
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  const total = parts.reduce((s, p) => s + p.w, 0);
  let i = 0;
  parts.forEach((p, k) => {
    const count = k === parts.length - 1 ? n - i : Math.round((p.w / total) * n);
    for (let j = 0; j < count && i < n; j++, i++) out.set(p.at(r), i * 3);
  });
  return out;
}

// ---------- modelos ----------

const MODELS: Record<string, (n: number) => Shape> = {
  // Caminhão: baú + cabine + rodas
  truck: (n) =>
    compose(
      n,
      [
        box([-0.35, 0.15, 0], [2.0, 0.95, 0.85], 5),
        box([1.05, -0.05, 0], [0.6, 0.6, 0.8], 1.6),
        box([1.12, 0.33, 0], [0.42, 0.22, 0.78], 0.6),
        ...[-1.0, -0.45, 1.05].flatMap((x) => [ring([x, -0.5, 0.42], 0.17, 0.06, 2, 0.5), ring([x, -0.5, -0.42], 0.17, 0.06, 2, 0.5)]),
      ],
      101,
    ),

  // Armazém: galpão com telhado de duas águas e portas
  warehouse: (n) =>
    compose(
      n,
      [
        box([0, -0.35, 0], [2.4, 1.0, 1.4], 5),
        {
          w: 3,
          at: (r) => {
            const x = (r() - 0.5) * 2.4;
            const s = r() < 0.5 ? -1 : 1;
            const t = r();
            return [x, 0.15 + (1 - t) * 0.55, s * t * 0.72];
          },
        },
        plane([-0.55, -0.55, 0.71], 0.55, 0.6, 0.8),
        plane([0.55, -0.55, 0.71], 0.55, 0.6, 0.8),
      ],
      102,
    ),

  // Rotas: estrada sinuosa com um pino de localização
  route: (n) =>
    compose(
      n,
      [
        {
          w: 6,
          at: (r) => {
            const t = r();
            const x = (t - 0.5) * 3.2;
            const z = Math.sin(t * TAU * 1.1) * 0.7;
            const side = (r() - 0.5) * 0.32;
            return [x - Math.cos(t * TAU * 1.1) * side * 0.6, -0.55, z + side];
          },
        },
        ball([0.75, 0.55, 0.15], [0.32, 0.32, 0.32], 1.6),
        tube((t) => [0.75, 0.55 - t * 0.95, 0.15], 0.05 + 0.0, 0.5),
        ring([0.75, 0.55, 0.15], 0.12, 0.03, 2, 0.4),
      ],
      103,
    ),

  // Frio: floco de neve de 6 braços com ramificações
  snowflake: (n) =>
    compose(
      n,
      Array.from({ length: 6 }, (_, k) => {
        const a = (k / 6) * TAU;
        const dir = (d: number, off = 0): V3 => [Math.cos(a + off) * d, Math.sin(a + off) * d, 0];
        const at = (d: number): V3 => dir(d);
        return [
          seg([0, 0, 0], at(1.55), 0.07, 2),
          seg(at(0.6), [at(0.6)[0] + Math.cos(a + 0.8) * 0.4, at(0.6)[1] + Math.sin(a + 0.8) * 0.4, 0], 0.06, 0.6),
          seg(at(0.6), [at(0.6)[0] + Math.cos(a - 0.8) * 0.4, at(0.6)[1] + Math.sin(a - 0.8) * 0.4, 0], 0.06, 0.6),
          seg(at(1.05), [at(1.05)[0] + Math.cos(a + 0.8) * 0.28, at(1.05)[1] + Math.sin(a + 0.8) * 0.28, 0], 0.05, 0.4),
          seg(at(1.05), [at(1.05)[0] + Math.cos(a - 0.8) * 0.28, at(1.05)[1] + Math.sin(a - 0.8) * 0.28, 0], 0.05, 0.4),
        ];
      }).flat(),
      104,
    ),

  // Embalagens/encomendas: caixa com fita e abas abertas
  package: (n) =>
    compose(
      n,
      [
        box([0, -0.15, 0], [1.6, 1.2, 1.6], 6),
        box([0, -0.15, 0], [0.22, 1.22, 1.62], 1.2),
        { w: 1.4, at: (r) => [(r() - 0.5) * 1.6, 0.45 + r() * 0.35, -0.8 - r() * 0.25] },
        { w: 1.4, at: (r) => [(r() - 0.5) * 1.6, 0.45 + r() * 0.35, 0.8 + r() * 0.25] },
      ],
      105,
    ),

  // Indústria: fábrica com telhado serrilhado, chaminés e fumaça
  factory: (n) =>
    compose(
      n,
      [
        box([0, -0.55, 0], [2.6, 0.8, 1.2], 5),
        {
          w: 3,
          at: (r) => {
            const k = Math.floor(r() * 4);
            const t = r();
            const x = -1.3 + (k + t) * 0.65;
            return [x, -0.15 + t * 0.45, (r() - 0.5) * 1.2];
          },
        },
        cylinder([0.75, 0.35, -0.3], 0.13, 1.4, 1, 1.4),
        cylinder([1.1, 0.2, -0.3], 0.11, 1.1, 1, 1.1),
        ball([0.8, 1.25, -0.3], [0.25, 0.2, 0.25], 0.6),
        ball([1.0, 1.55, -0.3], [0.32, 0.24, 0.32], 0.6),
        ball([1.3, 1.8, -0.3], [0.38, 0.26, 0.38], 0.5),
      ],
      106,
    ),

  // Agro: espiga de trigo com grãos e folhas
  wheat: (n) => {
    const stem = (t: number): V3 => [Math.sin(t * 1.8) * 0.18, -1.6 + t * 2.6, 0];
    const grains: Part[] = [];
    for (let k = 0; k < 9; k++) {
      const t = 0.6 + k * 0.045;
      const [x, y] = stem(t);
      const side = k % 2 ? 1 : -1;
      grains.push(ball([x + side * 0.16, y + 0.05, 0], [0.11, 0.2, 0.11], 0.9));
      grains.push(ball([x, y + 0.08, side * 0.14], [0.1, 0.18, 0.1], 0.6));
    }
    return compose(
      n,
      [
        tube(stem, 0.06, 2),
        ...grains,
        ball([stem(1)[0], stem(1)[1] + 0.12, 0], [0.09, 0.2, 0.09], 0.6),
        tube((t) => [stem(0.3)[0] + t * 0.7, stem(0.3)[1] + Math.sin(t * 2.4) * 0.45, t * 0.2], 0.05, 1),
        tube((t) => [stem(0.45)[0] - t * 0.6, stem(0.45)[1] + Math.sin(t * 2.4) * 0.4, -t * 0.2], 0.05, 0.9),
      ],
      107,
    );
  },

  // Varejo: loja com toldo listrado e letreiro
  store: (n) =>
    compose(
      n,
      [
        box([0, -0.5, 0], [2.2, 1.1, 1.1], 4),
        {
          w: 3,
          at: (r) => {
            const x = (r() - 0.5) * 2.4;
            const t = r();
            // listras: só metade das faixas recebe pontos densos
            const stripe = Math.floor((x + 1.2) / 0.3) % 2 === 0 || r() < 0.25;
            return stripe ? [x, 0.35 - t * 0.35, 0.55 + t * 0.45] : [x, 0.35, 0.55];
          },
        },
        plane([0, 0.62, 0.56], 1.6, 0.35, 0.9),
        plane([-0.55, -0.62, 0.56], 0.5, 0.75, 0.5),
        plane([0.45, -0.45, 0.56], 0.8, 0.5, 0.5),
      ],
      108,
    ),

  // Atacado/supermercado: carrinho de compras
  cart: (n) =>
    compose(
      n,
      [
        {
          w: 5,
          at: (r) => {
            // cesto em trapézio: mais largo em cima
            const t = r();
            const y = -0.35 + t * 0.9;
            const half = 0.55 + t * 0.3;
            const f = Math.floor(r() * 3);
            if (f === 0) return [(r() - 0.5) * 2 * half, y, r() < 0.5 ? -0.5 : 0.5];
            if (f === 1) return [r() < 0.5 ? -half : half, y, (r() - 0.5)];
            return [(r() - 0.5) * 1.1, -0.35, r() - 0.5];
          },
        },
        seg([0.85, 0.55, 0], [1.25, 1.0, 0], 0.06, 0.6),
        seg([1.25, 1.0, -0.45], [1.25, 1.0, 0.45], 0.06, 0.6),
        seg([-0.55, -0.35, 0], [-0.6, -0.75, 0], 0.05, 0.3),
        seg([0.55, -0.35, 0], [0.6, -0.75, 0], 0.05, 0.3),
        ring([-0.6, -0.85, 0.4], 0.12, 0.04, 2, 0.4),
        ring([-0.6, -0.85, -0.4], 0.12, 0.04, 2, 0.4),
        ring([0.6, -0.85, 0.4], 0.12, 0.04, 2, 0.4),
        ring([0.6, -0.85, -0.4], 0.12, 0.04, 2, 0.4),
      ],
      109,
    ),

  // Saúde: cruz médica em volume, com anel de batimento
  health: (n) =>
    compose(
      n,
      [
        box([0, 0, 0], [0.62, 2.0, 0.5], 3),
        box([0, 0, 0], [2.0, 0.62, 0.5], 3),
        tube(
          (t) => {
            const x = (t - 0.5) * 3.2;
            const ph = (t * 8) % 1;
            const y = ph > 0.45 && ph < 0.55 ? (ph - 0.5) * 9 : 0;
            return [x, y * 0.5 - 1.35, 0.3];
          },
          0.04,
          1.2,
        ),
      ],
      110,
    ),

  // Construção: capacete de obra (calota + aba + crista)
  hardhat: (n) =>
    compose(
      n,
      [
        ball([0, -0.35, 0], [1.05, 1.0, 0.95], 5, true),
        ring([0, -0.35, 0], 1.12, 0.12, 1, 2),
        { w: 1.2, at: (r) => [(r() - 0.5) * 0.3, -0.35 + 1.0 + (r() - 0.5) * 0.08, (r() - 0.5) * 1.6 * Math.sqrt(Math.max(0, 1 - Math.pow((r() - 0.5) * 2, 2)))] },
        plane([0, -0.45, 0.98], 0.9, 0.18, 0.4),
      ],
      111,
    ),

  // Contabilidade: calculadora com visor e teclas
  calc: (n) => {
    const keys: Part[] = [];
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) keys.push(box([-0.6 + col * 0.4, -0.85 + row * 0.38, 0.2], [0.28, 0.24, 0.08], 0.45));
    return compose(
      n,
      [box([0, 0, 0], [1.7, 2.6, 0.3], 4), plane([0, 0.85, 0.17], 1.3, 0.5, 1.2), ...keys],
      112,
    );
  },
};

const cache = new Map<string, Shape>();

/** Forma 3D do segmento; ícones desconhecidos caem num prédio genérico (caixa). */
export function nicheShape(icon: string, n: number): Shape {
  const key = `${icon}:${n}`;
  let s = cache.get(key);
  if (!s) {
    s = (MODELS[icon] ?? ((k: number) => compose(k, [box([0, 0, 0], [1.4, 2, 1.4])], 99)))(n);
    cache.set(key, s);
  }
  return s;
}

export const NICHE_ICONS = Object.keys(MODELS);
