// Geradores de nuvens de pontos (x,y,z) para o ParticleField.
// Todos devolvem exatamente `n` pontos, para poderem ser "morfados" entre si.

export type Shape = Float32Array;

// Gerador pseudoaleatório com semente: a mesma forma sai igual no servidor e no cliente.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gauss = (r: () => number) => {
  const u = Math.max(r(), 1e-6);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r());
};

/** Esfera (superfície + um pouco de volume), distribuição Fibonacci. */
export function sphere(n: number, radius = 1.6, seed = 1): Shape {
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = golden * i;
    const k = radius * (0.86 + r() * 0.14);
    out.set([Math.cos(th) * rad * k, y * k, Math.sin(th) * rad * k], i * 3);
  }
  return out;
}

/** Nuvem orgânica (como a do vídeo de referência). */
export function cloud(n: number, size = 1.7, seed = 2): Shape {
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = gauss(r) * size * 0.55;
    const y = gauss(r) * size * 0.42;
    const z = gauss(r) * size * 0.35;
    const w = 1 + 0.25 * Math.sin(x * 2.2) * Math.cos(y * 1.7);
    out.set([x * w, y * w, z], i * 3);
  }
  return out;
}

/**
 * Funil de prospecção: anéis empilhados, cada etapa com raio e quantidade de
 * pontos proporcionais ao valor real (Leads → Contatados → Responderam → Reuniões).
 */
export function funnel(n: number, values: number[], seed = 3): Shape {
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  const max = Math.max(...values, 1);
  // pontos por etapa: raiz para as etapas pequenas não sumirem
  const weights = values.map((v) => Math.sqrt(v / max) + 0.15);
  const total = weights.reduce((a, b) => a + b, 0);
  const H = 3.2;
  let i = 0;
  values.forEach((v, s) => {
    const count = s === values.length - 1 ? n - i : Math.round((weights[s] / total) * n);
    const top = H / 2 - (s / values.length) * H;
    const bottom = top - H / values.length + 0.18;
    const r0 = 0.25 + 1.75 * Math.sqrt(v / max);
    const r1 = 0.25 + 1.75 * Math.sqrt((values[s + 1] ?? v * 0.5) / max);
    for (let k = 0; k < count && i < n; k++, i++) {
      const t = r();
      const y = top + (bottom - top) * t;
      const rad = (r0 + (r1 - r0) * t) * (0.92 + r() * 0.08);
      const a = r() * Math.PI * 2;
      out.set([Math.cos(a) * rad, y, Math.sin(a) * rad], i * 3);
    }
  });
  return out;
}

/** Plano ondulado (camada "de dados" do vídeo). */
export function wave(n: number, w = 4.4, d = 2.6, seed = 4): Shape {
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * w;
    const z = (r() - 0.5) * d;
    const y = Math.sin(x * 1.6) * 0.32 + Math.cos(z * 2.4 + x) * 0.18 + (r() - 0.5) * 0.05;
    out.set([x, y - 0.2, z], i * 3);
  }
  return out;
}

/** Bloco/volume (o "cubo de partículas" do vídeo), com bordas mais densas. */
export function block(n: number, sx = 2.6, sy = 1.6, sz = 1.6, seed = 5): Shape {
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x = r() - 0.5;
    let y = r() - 0.5;
    let z = r() - 0.5;
    // 45% dos pontos vão para a superfície, desenhando as arestas
    if (r() < 0.45) {
      const f = Math.floor(r() * 3);
      if (f === 0) x = Math.sign(x) * 0.5;
      else if (f === 1) y = Math.sign(y) * 0.5;
      else z = Math.sign(z) * 0.5;
    }
    out.set([x * sx, y * sy, z * sz], i * 3);
  }
  return out;
}

/** Toro / anel (para o explorador de nichos). */
export function torus(n: number, R = 2.2, tube = 0.5, seed = 6): Shape {
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * Math.PI * 2;
    const v = r() * Math.PI * 2;
    const t = tube * Math.sqrt(r());
    out.set([(R + t * Math.cos(v)) * Math.cos(u), t * Math.sin(v) * 0.6, (R + t * Math.cos(v)) * Math.sin(u)], i * 3);
  }
  return out;
}

/** Hélice dupla (DNA): usada como forma alternativa de nicho. */
export function helix(n: number, seed = 7): Shape {
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = r();
    const strand = i % 2 ? Math.PI : 0;
    const a = t * Math.PI * 5 + strand;
    const rad = 0.9 + (r() - 0.5) * 0.12;
    out.set([Math.cos(a) * rad, (t - 0.5) * 3.2, Math.sin(a) * rad], i * 3);
  }
  return out;
}

/** Galáxia em espiral: forma alternativa de nicho. */
export function galaxy(n: number, arms = 3, seed = 8): Shape {
  const r = rng(seed);
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const rad = Math.pow(r(), 0.6) * 2.1;
    const arm = ((i % arms) / arms) * Math.PI * 2;
    const a = arm + rad * 1.6 + gauss(r) * 0.18;
    out.set([Math.cos(a) * rad, gauss(r) * 0.08 * (2.2 - rad), Math.sin(a) * rad], i * 3);
  }
  return out;
}
