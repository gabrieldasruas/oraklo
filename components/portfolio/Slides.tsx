"use client";

import { cores } from "@/lib/colors";
import type { Portfolio } from "@/lib/portfolio-types";

// Slides do portfólio (16:9). Tamanhos em cqw (relativos à largura do slide), então o mesmo
// slide fica igual na prévia pequena, em tela cheia e no PDF.
// Visual: papel quadriculado, abas de pasta, etiquetas neon inclinadas e títulos serifados.

const GRADE = {
  backgroundImage:
    "linear-gradient(color-mix(in srgb, var(--color-night) 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--color-night) 6%, transparent) 1px, transparent 1px)",
  backgroundSize: "2.6cqw 2.6cqw",
};

function Slide({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className="slide-portfolio @container">
      <div className={`relative aspect-video w-full overflow-hidden rounded-[2cqw] font-display text-night ${className}`} style={style}>
        {children}
      </div>
    </div>
  );
}

/** Faixa de rótulos no topo, como as abas de pasta das referências. */
function Topo({ esquerda, meio, direita, claro = false }: { esquerda: string; meio: string; direita: string; claro?: boolean }) {
  return (
    <div className={`absolute inset-x-[3cqw] top-[2.2cqw] flex justify-between text-[1.1cqw] ${claro ? "text-white/70" : "opacity-60"}`}>
      <span>({esquerda})</span>
      <span>({meio})</span>
      <span>({direita})</span>
    </div>
  );
}

/** Etiqueta inclinada (fita) na cor de destaque. */
function Etiqueta({ children, cor, girar = -3, escura = false }: { children: React.ReactNode; cor: string; girar?: number; escura?: boolean }) {
  return (
    <span
      className="inline-block px-[1.2cqw] py-[0.5cqw] text-[1.5cqw] font-medium leading-tight shadow-[0_0.4cqw_1cqw_-0.4cqw_color-mix(in_srgb,var(--color-black)_40%,transparent)]"
      style={{ background: escura ? cores.night : cor, color: escura ? cores.branco : cores.night, rotate: `${girar}deg` }}
    >
      {children}
    </span>
  );
}

const ano = new Date().getFullYear();

export default function Slides({ p }: { p: Portfolio }) {
  const { identidade: id, sobre, solucoes, cases, clientes } = p;
  const cor = id.cor || cores.neon;
  const nums = sobre.numeros.filter((n) => n.valor);
  const fontesMarca = ["font-serif italic", "font-display font-semibold tracking-[-0.04em]", "font-mono uppercase", "font-serif", "font-display font-light"];

  return (
    <div id="portfolio-slides" className="tema-original space-y-4">
      {/* 1 — Capa */}
      <Slide className="bg-night">
        <div className="absolute inset-x-0 top-0 h-[64%] rounded-b-[3cqw] bg-white" style={GRADE}>
          <Topo esquerda="Portfólio" meio={`${ano}`} direita={id.empresa} />
          <div className="flex h-full flex-col items-center justify-center pt-[2cqw] text-center">
            <h2 className="font-serif text-[8.5cqw] leading-[0.9] tracking-[-0.02em]">{id.empresa}</h2>
            <div className="mt-[1.6cqw] flex flex-col items-center gap-[0.6cqw]">
              <Etiqueta cor={cor}>{id.tagline}</Etiqueta>
              <Etiqueta cor={cor} escura girar={1.5}>
                Portfólio de soluções · {id.nome}
              </Etiqueta>
            </div>
          </div>
        </div>
        {/* "clipe" central com o logo */}
        <div className="absolute left-1/2 top-[64%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <span className="flex size-[7cqw] items-center justify-center overflow-hidden rounded-full border-[0.4cqw] border-night shadow-lg" style={{ background: cor }}>
            {id.logo ? <img src={id.logo} alt="" className="size-full object-cover" /> : <span className="size-[2.2cqw] rounded-full bg-night" />}
          </span>
          <span className="mt-[1cqw] font-serif text-[1.4cqw] italic text-white/80">(abrir portfólio)</span>
        </div>
        <div className="absolute inset-x-[3cqw] bottom-[2.4cqw] flex justify-between text-[1.1cqw] text-white/60">
          <span>{id.email}</span>
          <span>© {ano} {id.empresa}</span>
          <span>{id.telefone}</span>
        </div>
      </Slide>

      {/* 2 — Sobre (estilo "Resume") */}
      <Slide className="bg-white" style={GRADE}>
        <Topo esquerda="Sobre" meio={id.cidade} direita={id.site} />
        <div className="absolute right-[3cqw] top-[5cqw] flex max-w-[60%] flex-wrap justify-end gap-[0.5cqw]">
          {sobre.especialidades.slice(0, 6).map((e) => (
            <span key={e} className="rounded-[0.4cqw] border border-night/30 bg-white px-[0.8cqw] py-[0.2cqw] text-[1.05cqw]">
              {e}
            </span>
          ))}
        </div>
        <div className="absolute inset-x-[6cqw] bottom-[5cqw] top-[11cqw] grid grid-cols-[28%_1fr] gap-[4cqw]">
          <div className="relative">
            <div className="relative h-[70%] overflow-hidden border-[0.5cqw] border-night bg-night/80">
              {id.foto || id.logo ? (
                <img src={(id.foto ?? id.logo)!} alt="" className="size-full object-cover grayscale" />
              ) : (
                <span className="flex size-full items-center justify-center font-serif text-[6cqw] text-white/80">{id.nome.charAt(0)}</span>
              )}
              <span className="absolute bottom-[0.6cqw] left-[0.8cqw] text-[1cqw] text-white/80">{id.nome}</span>
            </div>
            <div className="absolute -left-[1.4cqw] -top-[1.6cqw]">
              <Etiqueta cor={cor} girar={-12}>
                (sobre mim)
              </Etiqueta>
            </div>
            <p className="mt-[1.2cqw] font-serif text-[4.6cqw] leading-none">Sobre</p>
          </div>
          <div className="flex flex-col justify-center gap-[1.6cqw] border-l border-night/20 pl-[3cqw]">
            {[
              ["Quem", `${id.nome} · ${id.cargo}`],
              ["Base", id.cidade],
              ["Contato", [id.email, id.telefone].filter(Boolean).join(" · ")],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[18%_1fr] text-[1.35cqw]">
                <span className="opacity-50">{k}</span>
                <span>{v}</span>
              </div>
            ))}
            <p className="text-[1.5cqw] leading-relaxed">{sobre.texto}</p>
          </div>
        </div>
      </Slide>

      {/* 3 — Soluções (estilo "Contents") */}
      <Slide style={{ background: cor }}>
        <div className="absolute left-0 top-0 h-[7cqw] w-[38%] rounded-br-[2.4cqw] bg-white/90" />
        <span className="absolute left-[3cqw] top-[2.2cqw] font-mono text-[1.05cqw] uppercase tracking-widest opacity-60">{id.empresa} · soluções</span>
        <div className="absolute inset-x-[6cqw] top-[13cqw] grid grid-cols-4 gap-[1.6cqw]">
          {solucoes.slice(0, 4).map((s, i) => (
            <div
              key={s.id}
              className={`flex aspect-[4/5] flex-col justify-between rounded-[1.2cqw] p-[1.4cqw] shadow-[0_1cqw_2cqw_-1cqw_color-mix(in_srgb,var(--color-black)_45%,transparent)] ${i % 2 ? "bg-papel-creme" : "bg-night text-white"}`}
              style={{ rotate: `${[-2, 1.5, -1, 2][i]}deg` }}
            >
              <span className="font-mono text-[0.9cqw] opacity-60">{String(ano)} · {String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="font-mono text-[1.1cqw] uppercase">Parte {String(i + 1).padStart(2, "0")}</p>
                <p className="mt-[0.4cqw] text-[1.8cqw] font-medium leading-tight tracking-[-0.02em]">{s.titulo}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-[3.4cqw] text-center">
          <p className="font-serif text-[5cqw] leading-none">Soluções</p>
          <p className="font-serif text-[1.4cqw] italic opacity-70">(o que oferecemos para empresas)</p>
        </div>
      </Slide>

      {/* 4 — Detalhe das soluções */}
      {solucoes.length > 0 && (
        <Slide className="bg-white" style={GRADE}>
          <Topo esquerda="Soluções" meio="Investimento" direita={id.empresa} />
          <p className="absolute left-[6cqw] top-[6cqw] font-serif text-[4.4cqw] leading-none">Como podemos ajudar</p>
          <ul className="absolute inset-x-[6cqw] bottom-[4cqw] top-[14cqw] grid content-start gap-[1.2cqw]">
            {solucoes.slice(0, 6).map((s, i) => (
              <li key={s.id} className="grid grid-cols-[4cqw_1fr_auto] items-baseline gap-[1.4cqw] border-b border-night/15 pb-[1cqw]">
                <span className="font-mono text-[1.2cqw] opacity-50">{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span className="block text-[1.8cqw] font-medium leading-tight tracking-[-0.02em]">{s.titulo}</span>
                  <span className="block text-[1.25cqw] opacity-60">{s.descricao}</span>
                </span>
                {s.preco && (
                  <span className="rounded-full px-[1cqw] py-[0.3cqw] text-[1.15cqw] font-medium" style={{ background: cor }}>
                    {s.preco}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Slide>
      )}

      {/* 5 — Números (estilo "$500.2M") */}
      {nums.length > 0 && (
        <Slide className="bg-white">
          <p className="absolute left-[5cqw] top-[5cqw] text-[9cqw] font-medium leading-none tracking-[-0.05em]">{nums[0].valor}</p>
          <span className="absolute left-[6cqw] top-[16.5cqw] rounded-full border border-night px-[1.2cqw] py-[0.3cqw] text-[1.2cqw]">{nums[0].rotulo}</span>
          <div className="absolute right-[4cqw] top-[5cqw] max-w-[28%] text-right text-[1.25cqw]">
            <p className="font-medium">{id.empresa}</p>
            <p className="opacity-60">{id.tagline}</p>
          </div>
          <div className="absolute inset-x-[4cqw] bottom-[6cqw] flex">
            {nums.slice(1, 5).map((n, i) => (
              <div
                key={i}
                className="-ml-[1.5cqw] flex h-[12cqw] flex-1 flex-col justify-center rounded-full border border-night px-[3cqw] first:ml-0"
                style={i === 0 ? { background: `linear-gradient(90deg, ${cor}, transparent)` } : undefined}
              >
                <span className="text-[2.6cqw] font-medium tracking-[-0.03em]">{n.valor}</span>
                <span className="text-[1.2cqw] opacity-70">{n.rotulo}</span>
              </div>
            ))}
          </div>
          <div className="absolute inset-x-[4cqw] bottom-[2.4cqw] flex items-center justify-between border-t border-night/30 pt-[0.8cqw] text-[1.1cqw]">
            <span>Resultados</span>
            <span className="rounded-full px-[1cqw] py-[0.2cqw] text-[1cqw]" style={{ background: cor }}>
              {id.site}
            </span>
          </div>
        </Slide>
      )}

      {/* 6 — Cases (estilo "Market Validation") */}
      {cases.length > 0 && (
        <Slide className="bg-white">
          <p className="absolute left-[4cqw] top-[3cqw] text-[5.6cqw] font-medium leading-[0.95] tracking-[-0.04em]">
            Casos de
            <br />
            sucesso
          </p>
          <span className="absolute right-[4cqw] top-[4cqw] rounded-full border border-night px-[1.2cqw] py-[0.3cqw] text-[1.1cqw]">{id.empresa}</span>
          <div className="absolute inset-x-[4cqw] bottom-[3cqw] top-[18cqw] rounded-t-[3cqw] border border-night p-[3cqw]" style={{ background: cor }}>
            <div className="grid h-full grid-cols-2 gap-[3cqw]">
              {cases.slice(0, 2).map((c) => (
                <div key={c.id} className="flex flex-col">
                  <p className="text-[2.4cqw] font-medium leading-tight tracking-[-0.03em]">{c.resultado}</p>
                  {c.depoimento && <p className="mt-[1cqw] text-[1.35cqw] leading-relaxed">“{c.depoimento}”</p>}
                  <p className="mt-auto border-t border-night/40 pt-[0.8cqw] text-[1.2cqw]">
                    <b className="font-medium">{c.cliente}</b>
                    {c.autor && <span className="opacity-70"> · {c.autor}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Slide>
      )}

      {/* 7 — Clientes (estilo "Our Customer") */}
      {clientes.length > 0 && (
        <Slide className="bg-papel-slide">
          <div className="absolute inset-y-0 left-0 w-[46%]" style={{ background: cor }} />
          <div className="absolute inset-y-0 left-[46%] w-[12%]" style={{ background: `linear-gradient(90deg, ${cor}, transparent)` }} />
          <p className="absolute bottom-[4cqw] left-[4cqw] text-[6cqw] font-medium leading-[0.95] tracking-[-0.04em]">
            Quem
            <br />
            confia
          </p>
          <div className="absolute right-[4cqw] top-[6cqw] flex max-w-[50%] flex-wrap justify-end gap-x-[2.4cqw] gap-y-[1.4cqw]">
            {clientes.slice(0, 10).map((c, i) => (
              <span key={c + i} className={`text-[2.6cqw] leading-none ${fontesMarca[i % fontesMarca.length]}`}>
                {c}
              </span>
            ))}
          </div>
          <span className="absolute bottom-[4cqw] right-[4cqw] rounded-full border border-night px-[1.2cqw] py-[0.3cqw] text-[1.1cqw]">{id.empresa}</span>
        </Slide>
      )}

      {/* 8 — Contato */}
      <Slide className="bg-night text-white">
        <div className="absolute inset-x-0 top-0 h-[38%] rounded-b-[3cqw] bg-white text-night" style={GRADE}>
          <Topo esquerda="Contato" meio={`${ano}`} direita={id.empresa} />
          <div className="absolute inset-x-0 bottom-[2.6cqw] flex justify-center gap-[0.6cqw]">
            <Etiqueta cor={cor}>Vamos conversar?</Etiqueta>
            <Etiqueta cor={cor} escura girar={2}>
              {id.telefone}
            </Etiqueta>
          </div>
        </div>
        <span className="absolute left-1/2 top-[52%] block size-[3cqw] -translate-x-1/2 rounded-full border-[0.5cqw] border-white" style={{ background: cor }} />
        <div className="absolute inset-x-0 top-[60%] text-center">
          <p className="font-serif text-[5.4cqw] leading-none">Obrigado pela atenção</p>
          <p className="mt-[0.8cqw] font-serif text-[1.6cqw] italic text-white/70">({id.nome} · {id.cargo})</p>
        </div>
        <div className="absolute inset-x-[3cqw] bottom-[2.4cqw] flex justify-between text-[1.1cqw] text-white/60">
          <span>{id.email}</span>
          <span>{id.site}</span>
          <span>{id.linkedin || id.cidade}</span>
        </div>
      </Slide>
    </div>
  );
}
