"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowUpRight, Globe, Loader2, Mail, Phone, Search, UserRound } from "lucide-react";
import { LinkedinIcon, WhatsappIcon } from "@/components/brand/Icons";
import { formatPhone, SIZE_LABEL } from "@/lib/format";
import { ehDecisor, googleBusca, iniciais, linkedinEmpresa, linkedinPessoas, nomeParaBusca, rotuloCargo, sitePeloEmail } from "@/lib/crm";

type Socio = { name: string; kind: string | null; role: string | null; enteredAt: string | null };
type Detalhe = { partners: Socio[]; website: string | null };
type Base = { cnpj: string; name: string; email: string | null; phones: string[]; isHeadquarters: boolean; size: string; city: string; uf: string };

// Detalhes já carregados (vale para a página toda; evita buscar de novo ao passar o mouse outra vez).
const cache = new Map<string, Detalhe | "erro">();

const ABRIR_MS = 250;
const FECHAR_MS = 180;
const LARGURA = 360;

const celular = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length === 11 && d[2] === "9" ? d : null;
};

/**
 * Nome da empresa com uma "pré-ficha" ao passar o mouse:
 * quem decide (com avatar), LinkedIn, WhatsApp/telefone, e-mail e site — sem precisar clicar.
 */
export default function PreviaEmpresa({ empresa, className = "" }: { empresa: Base; className?: string }) {
  const ancora = useRef<HTMLAnchorElement>(null);
  const [aberta, setAberta] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; acima: boolean } | null>(null);
  const [det, setDet] = useState<Detalhe | "erro" | null>(cache.get(empresa.cnpj) ?? null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const agendar = (abrir: boolean) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAberta(abrir), abrir ? ABRIR_MS : FECHAR_MS);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  // Carrega sócios/cargos na primeira vez que abre.
  useEffect(() => {
    if (!aberta || det) return;
    let vivo = true;
    fetch(`/api/companies/${empresa.cnpj}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        const d: Detalhe = { partners: j.partners ?? [], website: j.website ?? null };
        cache.set(empresa.cnpj, d);
        if (vivo) setDet(d);
      })
      .catch(() => {
        cache.set(empresa.cnpj, "erro");
        if (vivo) setDet("erro");
      });
    return () => {
      vivo = false;
    };
  }, [aberta, det, empresa.cnpj]);

  // Posição: abaixo do nome; se não couber, acima.
  useLayoutEffect(() => {
    if (!aberta || !ancora.current) return;
    const r = ancora.current.getBoundingClientRect();
    const acima = r.bottom + 340 > window.innerHeight && r.top > 340;
    setPos({
      top: acima ? r.top - 8 : r.bottom + 8,
      left: Math.max(12, Math.min(r.left, window.innerWidth - LARGURA - 12)),
      acima,
    });
    const fechar = () => setAberta(false);
    window.addEventListener("scroll", fechar, true);
    return () => window.removeEventListener("scroll", fechar, true);
  }, [aberta]);

  const marca = nomeParaBusca(empresa.name);
  const pessoas =
    det && det !== "erro"
      ? det.partners
          .filter((p) => p.kind !== "PJ")
          .map((p) => ({ ...p, decisor: ehDecisor(p.role) }))
          .sort((a, b) => Number(b.decisor) - Number(a.decisor))
          .slice(0, 3)
      : [];
  const site = sitePeloEmail(empresa.email) ?? (det && det !== "erro" && det.website ? det.website.replace(/^https?:\/\//, "") : null);
  const zap = empresa.phones.map(celular).find(Boolean);
  const fone = empresa.phones[0];

  const acao =
    "flex size-10 items-center justify-center rounded-full border border-night/10 bg-white transition-colors hover:border-night hover:bg-night hover:text-white";

  return (
    <>
      <Link
        ref={ancora}
        href={`/empresas/${empresa.cnpj}`}
        onMouseEnter={() => agendar(true)}
        onMouseLeave={() => agendar(false)}
        onFocus={() => agendar(true)}
        onBlur={() => agendar(false)}
        className={`font-medium tracking-[-0.01em] underline decoration-night/20 decoration-dotted underline-offset-4 hover:decoration-night ${className}`}
      >
        {empresa.name}
      </Link>

      {aberta &&
        pos &&
        createPortal(
          <div
            role="dialog"
            aria-label={`Prévia de ${empresa.name}`}
            onMouseEnter={() => agendar(true)}
            onMouseLeave={() => agendar(false)}
            className="tema-app previa-in fixed z-[1000] rounded-[22px] border border-night/10 bg-papel-previa p-4 font-display text-night shadow-[0_30px_70px_-25px_color-mix(in_srgb,var(--color-black)_55%,transparent)]"
            style={{ top: pos.top, left: pos.left, width: LARGURA, transform: pos.acima ? "translateY(-100%)" : undefined }}
          >
            {/* cabeçalho */}
            <p className="text-sm font-medium leading-tight">{empresa.name}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest opacity-50">
              {empresa.isHeadquarters ? "Matriz" : "Filial"} · {SIZE_LABEL[empresa.size] ?? "—"} · {empresa.city}/{empresa.uf}
            </p>

            {/* quem decide */}
            <div className="mt-3 rounded-2xl bg-white p-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">Quem decide</p>
              {!det && (
                <p className="mt-2 flex items-center gap-2 text-xs opacity-60">
                  <Loader2 size={13} className="animate-spin" aria-hidden /> Buscando sócios e cargos…
                </p>
              )}
              {det && pessoas.length > 0 && (
                <ul className="mt-2 space-y-2">
                  {pessoas.map((p, i) => (
                    <li key={`${p.name}-${i}`} className="flex items-center gap-3">
                      {/* avatar ilustrativo: iniciais + bonequinho */}
                      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-night font-mono text-xs text-neon">
                        {iniciais(p.name)}
                        <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-neon text-night ring-2 ring-white">
                          <UserRound size={10} aria-hidden />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium leading-tight">{p.name}</span>
                        <span className="block text-[11px] opacity-60">
                          {rotuloCargo(p.role)}
                          {p.decisor && <span className="ml-1.5 rounded-full bg-neon px-1.5 py-px text-[9px] font-medium uppercase">decisor</span>}
                        </span>
                      </span>
                      <a
                        href={linkedinPessoas(`${p.name} ${marca}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`${p.name} no LinkedIn`}
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linkedin text-white hover:opacity-85"
                      >
                        <LinkedinIcon size={13} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {det && pessoas.length === 0 && (
                <a
                  href={linkedinPessoas(`CEO ${marca}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-3 rounded-xl px-1 py-1 text-xs hover:bg-night/5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-night/10">
                    <UserRound size={18} aria-hidden />
                  </span>
                  <span>
                    <span className="block font-medium">CEO / diretor da {marca}</span>
                    <span className="block opacity-60">{det === "erro" ? "Não deu para carregar os sócios" : "Sem sócio pessoa física"} · buscar no LinkedIn</span>
                  </span>
                </a>
              )}
            </div>

            {/* ações rápidas */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={linkedinEmpresa(marca)} target="_blank" rel="noopener noreferrer" title="Empresa no LinkedIn" className={`${acao} !border-linkedin !bg-linkedin text-white`}>
                <LinkedinIcon size={16} />
              </a>
              {zap ? (
                <a href={`https://wa.me/55${zap}`} target="_blank" rel="noopener noreferrer" title={`WhatsApp ${formatPhone(zap)}`} className={`${acao} !border-whatsapp !bg-whatsapp text-white`}>
                  <WhatsappIcon size={17} />
                </a>
              ) : (
                fone && (
                  <a href={`tel:+55${fone.replace(/\D/g, "")}`} title={`Ligar ${formatPhone(fone)}`} className={acao}>
                    <Phone size={16} aria-hidden />
                  </a>
                )
              )}
              {empresa.email && (
                <a href={`mailto:${empresa.email}`} title={empresa.email} className={acao}>
                  <Mail size={16} aria-hidden />
                </a>
              )}
              {site && (
                <a href={`https://${site}`} target="_blank" rel="noopener noreferrer" title={site} className={acao}>
                  <Globe size={16} aria-hidden />
                </a>
              )}
              <a href={googleBusca(`${marca} ${empresa.city}`)} target="_blank" rel="noopener noreferrer" title="Buscar no Google" className={acao}>
                <Search size={16} aria-hidden />
              </a>
              <Link
                href={`/empresas/${empresa.cnpj}`}
                className="ml-auto flex min-h-10 items-center gap-1 rounded-full bg-night px-4 text-xs font-medium text-white hover:bg-neon hover:text-night"
              >
                Ficha completa <ArrowUpRight size={13} aria-hidden />
              </Link>
            </div>
            {fone && <p className="mt-2 font-mono text-[11px] opacity-50">{formatPhone(zap ?? fone)}{zap ? " · WhatsApp" : ""}</p>}
          </div>,
          document.body,
        )}
    </>
  );
}
