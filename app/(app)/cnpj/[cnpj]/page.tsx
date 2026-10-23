import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Lock, Mail, MapPin, Phone } from "lucide-react";
import { site } from "@/content/site";
import PageHeader from "@/components/app/PageHeader";
import { Aura, Glass, Micro, Pill } from "@/components/app/ui";
import { getCompany } from "@/lib/companies";
import { formatCnae, formatCnpj, formatMoney, SIZE_LABEL } from "@/lib/format";
import { mascararEmail, mascararTelefone, slugCidade } from "@/lib/consulta";
import { calcularScore, faixaScore } from "@/lib/score";

// Página pública da empresa: só dados cadastrais. Contatos mascarados e sócios ocultos (LGPD);
// quem cria conta vê tudo em /empresas/[cnpj].

type Props = { params: Promise<{ cnpj: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await getCompany((await params).cnpj).catch(() => null);
  if (!c) return { title: `Empresa não encontrada — ${site.name}`, robots: { index: false } };
  return {
    title: `${c.name} — CNPJ ${formatCnpj(c.cnpj)} — ${c.city}/${c.uf}`,
    description: `${c.legalName || c.name}: ${c.cnaeMainDescription ?? "atividade não informada"}, ${SIZE_LABEL[c.size] ?? "porte não informado"}, capital social ${formatMoney(c.shareCapital)}, em ${c.city}/${c.uf}.`,
    alternates: { canonical: `/cnpj/${c.cnpj}` },
  };
}

export default async function CnpjPublicoPage({ params }: Props) {
  const c = await getCompany((await params).cnpj).catch(() => null);
  if (!c) notFound();
  const sc = calcularScore(c);
  const f = faixaScore(sc.score);
  const anos = c.openedAt ? Math.floor((Date.now() - new Date(c.openedAt).getTime()) / (365.25 * 86_400_000)) : null;
  const email = mascararEmail(c.email);
  const telefones = c.phones.map(mascararTelefone).filter(Boolean) as string[];
  const entrar = `/entrar?next=${encodeURIComponent(`/empresas/${c.cnpj}`)}`;

  const dados = [
    { t: "CNPJ", v: formatCnpj(c.cnpj) },
    { t: "Razão social", v: c.legalName || c.name },
    { t: "Atividade principal", v: c.cnaeMain ? `${formatCnae(c.cnaeMain)} · ${c.cnaeMainDescription ?? ""}` : "—" },
    { t: "Porte", v: SIZE_LABEL[c.size] ?? "Não informado" },
    { t: "Capital social", v: formatMoney(c.shareCapital) },
    { t: "Abertura", v: c.openedAt ? `${new Date(c.openedAt).toLocaleDateString("pt-BR")}${anos !== null ? ` (${anos} anos)` : ""}` : "—" },
    { t: "Tipo", v: c.isHeadquarters ? "Matriz" : "Filial" },
    { t: "Endereço", v: [c.address, c.district, `${c.city}/${c.uf}`, c.zip ? `CEP ${c.zip.replace(/(\d{5})(\d{3})/, "$1-$2")}` : null].filter(Boolean).join(" · ") },
  ];

  return (
    <>
      <PageHeader index="12" title={c.name} description={`${c.cnaeMainDescription ?? "Empresa"} em ${c.city}/${c.uf}. Dados públicos do CNPJ.`} action={<Pill href={entrar}>Ver contatos grátis</Pill>} />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/consulta" className="flex min-h-9 items-center gap-1.5 rounded-full border border-night/10 bg-white/60 px-3 text-xs hover:bg-white">
          <ArrowLeft size={12} aria-hidden /> Consulta
        </Link>
        {c.city && (
          <Link href={`/consulta/${slugCidade(c.city, c.uf)}`} className="flex min-h-9 items-center gap-1.5 rounded-full border border-night/10 bg-white/60 px-3 text-xs hover:bg-white">
            <MapPin size={12} aria-hidden /> Empresas em {c.city}
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Glass className="p-7">
          <Micro>Dados cadastrais</Micro>
          <dl className="mt-5 divide-y divide-night/10">
            {dados.map((d) => (
              <div key={d.t} className="grid gap-1 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4">
                <dt className="font-mono text-[10px] uppercase tracking-widest opacity-50">{d.t}</dt>
                <dd className="text-sm">{d.v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[11px] opacity-45">Fonte: cadastro público de CNPJ da Receita Federal ({c.sourcePeriod}).</p>
        </Glass>

        <div className="space-y-4">
          <Glass className="p-7">
            <Micro>Score Oraklo</Micro>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-6xl font-light leading-none tracking-[-0.05em]">{sc.score}</span>
              <span className="tema-original mb-1 rounded-full px-2.5 py-0.5 font-mono text-[11px] text-night" style={{ background: f.cor }}>
                {f.rotulo}
              </span>
            </div>
            <p className="mt-3 text-xs opacity-60">Chance de ser um bom lead, de 0 a 100: {sc.motivos.join(", ") || "poucos dados públicos"}.</p>
          </Glass>

          <Aura tone="night" className="relative p-7">
            <Micro className="!opacity-60">Contatos</Micro>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Mail size={15} aria-hidden className="text-neon" /> <span className="font-mono">{email ?? "não informado"}</span>
              </li>
              {telefones.slice(0, 2).map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <Phone size={15} aria-hidden className="text-neon" /> <span className="font-mono">{t}</span>
                </li>
              ))}
              <li className="flex items-center gap-3 text-white/60">
                <Building2 size={15} aria-hidden className="text-neon" /> Sócios e decisores
              </li>
            </ul>
            <div className="mt-6 flex items-center gap-2 rounded-2xl bg-white/5 p-3 text-xs text-white/70">
              <Lock size={13} aria-hidden className="shrink-0 text-neon" /> Crie uma conta grátis para ver os contatos completos, os decisores e mandar a empresa para o seu pipeline.
            </div>
            <Pill href={entrar} tone="neon" className="mt-5">
              Ver contatos grátis
            </Pill>
          </Aura>
        </div>
      </div>
    </>
  );
}
