import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Building2, CheckCircle2, Globe, Mail, MapPin, Phone, Search, UserRound } from "lucide-react";
import { site } from "@/content/site";
import { requireUser } from "@/lib/auth";
import { getCompany } from "@/lib/companies";
import { formatCnae, formatCnpj, formatMoney, formatPhone, SIZE_LABEL } from "@/lib/format";
import {
  CARGOS_LIDERANCA,
  ehDecisor,
  googleBusca,
  googleMaps,
  iniciais,
  linkedinEmpresa,
  linkedinPessoas,
  nomeParaBusca,
  rotuloCargo,
  sitePeloEmail,
  tipoDoEmail,
} from "@/lib/crm";
import { addCompanyAsLead } from "@/app/(app)/leads/actions";
import { Aura, Glass, Micro, Pill } from "@/components/app/ui";

export const metadata: Metadata = { title: `Empresa — ${site.name}` };

const date = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

// Ícone do LinkedIn (a lucide não traz marcas).
function LinkedinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

const botaoLink = "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-night/15 bg-white/80 px-3 text-xs font-medium hover:border-night hover:bg-night hover:text-white";

export default async function EmpresaPage({ params }: PageProps<"/empresas/[cnpj]">) {
  await requireUser();
  const { cnpj } = await params;
  const c = await getCompany(cnpj);
  if (!c) notFound();

  const marca = nomeParaBusca(c.name);
  const site_ = sitePeloEmail(c.email) ?? (c.website ? c.website.replace(/^https?:\/\//, "").replace(/\/$/, "") : null);
  const tipoEmail = tipoDoEmail(c.email);
  const enderecoCompleto = [c.address, c.district, c.city && `${c.city} - ${c.uf}`, c.zip && `CEP ${c.zip.replace(/^(\d{5})(\d{3})$/, "$1-$2")}`]
    .filter(Boolean)
    .join(", ");

  // Pessoas da empresa (QSA): quem decide primeiro.
  const pessoas = c.partners
    .filter((p) => p.kind !== "PJ")
    .map((p) => ({ ...p, decisor: ehDecisor(p.role), cargo: rotuloCargo(p.role) }))
    .sort((a, b) => Number(b.decisor) - Number(a.decisor));
  const empresasSocias = c.partners.filter((p) => p.kind === "PJ");

  const fatos = [
    { l: "CNPJ", v: formatCnpj(c.cnpj) },
    { l: "Tipo", v: c.isHeadquarters ? "Matriz" : "Filial" },
    { l: "Porte", v: SIZE_LABEL[c.size] ?? "—" },
    { l: "Capital social", v: formatMoney(c.shareCapital) },
    { l: "Abertura", v: date(c.openedAt) },
    { l: "Situação", v: c.status === "02" ? "Ativa" : "Fora da base atual" },
  ];

  const proximosPassos = [
    { feito: pessoas.some((p) => p.decisor), t: "Identificar quem decide", d: "Sócios e administradores da Receita, abaixo." },
    { feito: false, t: "Achar o decisor no LinkedIn", d: "Use os atalhos de cada pessoa ou de cada cargo." },
    {
      feito: !!c.email && !tipoEmail,
      t: "Confirmar o melhor contato",
      d:
        tipoEmail === "contabilidade"
          ? "O e-mail da Receita parece ser da contabilidade."
          : tipoEmail === "fiscal"
            ? "O e-mail da Receita é do setor fiscal; peça o contato comercial."
            : "E-mail e telefone da Receita ao lado.",
    },
    { feito: false, t: "Adicionar aos leads e abordar", d: "Depois, inclua numa sequência." },
  ];

  return (
    <>
      <div className="px-1 pt-4">
        <Link href="/empresas" className="inline-flex min-h-11 items-center gap-2 text-sm opacity-70 hover:opacity-100">
          <ArrowLeft size={16} aria-hidden /> Voltar à busca
        </Link>
      </div>

      {/* Cabeçalho */}
      <header className="flex flex-wrap items-end justify-between gap-6 px-1 pb-6 pt-2 md:pb-8">
        <div className="min-w-0">
          <Micro>{c.cnaeMain ? `${formatCnae(c.cnaeMain)} · ${c.cnaeMainDescription ?? ""}` : "Empresa"}</Micro>
          <h1 className="mt-3 text-4xl font-medium leading-[0.95] tracking-[-0.045em] md:text-6xl">{c.name}</h1>
          {c.legalName && c.legalName !== c.name && <p className="mt-3 text-sm opacity-60">{c.legalName}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={linkedinEmpresa(marca)} target="_blank" rel="noopener noreferrer" className={botaoLink}>
              <LinkedinIcon /> Empresa no LinkedIn
            </a>
            {site_ && (
              <a href={`https://${site_}`} target="_blank" rel="noopener noreferrer" className={botaoLink}>
                <Globe size={14} aria-hidden /> {site_}
              </a>
            )}
            <a href={googleBusca(`${marca} ${c.city ?? ""} site oficial`)} target="_blank" rel="noopener noreferrer" className={botaoLink}>
              <Search size={14} aria-hidden /> Buscar no Google
            </a>
            {enderecoCompleto && (
              <a href={googleMaps(enderecoCompleto)} target="_blank" rel="noopener noreferrer" className={botaoLink}>
                <MapPin size={14} aria-hidden /> Ver no mapa
              </a>
            )}
          </div>
        </div>
        <form action={addCompanyAsLead}>
          <input type="hidden" name="cnpj" value={c.cnpj} />
          <Pill type="submit">Adicionar aos leads</Pill>
        </form>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {/* Quem decide */}
          <Glass className="p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Micro>Quem decide · sócios e administradores</Micro>
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-40">Fonte: Receita (QSA)</span>
            </div>
            {pessoas.length ? (
              <ul className="mt-4 grid gap-3 md:grid-cols-2">
                {pessoas.map((p, i) => (
                  <li key={`${p.name}-${i}`} className={`rounded-2xl border p-4 ${p.decisor ? "border-night bg-white/80" : "border-night/10 bg-white/50"}`}>
                    <div className="flex items-start gap-3">
                      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full font-mono text-xs ${p.decisor ? "bg-night text-neon" : "bg-night/10"}`}>
                        {iniciais(p.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium leading-tight">{p.name}</p>
                        <p className="mt-0.5 text-xs opacity-60">
                          {p.cargo}
                          {p.enteredAt && ` · desde ${p.enteredAt.slice(0, 4)}`}
                        </p>
                        {p.decisor && <span className="mt-2 inline-block rounded-full bg-neon px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">Decisor</span>}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={linkedinPessoas(`${p.name} ${marca}`)} target="_blank" rel="noopener noreferrer" className={botaoLink}>
                        <LinkedinIcon /> LinkedIn
                      </a>
                      <a href={googleBusca(`"${p.name}" ${marca}`)} target="_blank" rel="noopener noreferrer" className={botaoLink}>
                        <Search size={13} aria-hidden /> Google
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm opacity-60">Nenhuma pessoa física no quadro de sócios. Use os cargos abaixo para achar os líderes.</p>
            )}
            {empresasSocias.length > 0 && (
              <p className="mt-4 text-xs opacity-60">
                <Building2 size={12} className="mr-1 inline" aria-hidden />
                Controlada por: {empresasSocias.map((p) => p.name).join(", ")}
              </p>
            )}
          </Glass>

          {/* Líderes por cargo */}
          <Glass className="p-6">
            <Micro>Encontre os líderes no LinkedIn</Micro>
            <p className="mt-2 text-sm opacity-60">Busca pronta de pessoas da {marca} pelo cargo. Abre no LinkedIn, já filtrado.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {CARGOS_LIDERANCA.map((cargo) => (
                <a key={cargo} href={linkedinPessoas(`${cargo} ${marca}`)} target="_blank" rel="noopener noreferrer" className={botaoLink}>
                  <UserRound size={13} aria-hidden /> {cargo}
                </a>
              ))}
            </div>
          </Glass>

          {/* Dados cadastrais */}
          <Glass className="p-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
              {fatos.map((f) => (
                <div key={f.l}>
                  <dt className="font-mono text-[10px] uppercase tracking-widest opacity-50">{f.l}</dt>
                  <dd className="mt-1 text-base">{f.v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-6 border-t border-night/10 pt-5">
              <Micro>Endereço</Micro>
              <p className="mt-2 text-sm leading-relaxed">{enderecoCompleto || "—"}</p>
            </div>
            {c.cnaeSecondary.length > 0 && (
              <details className="mt-5 border-t border-night/10 pt-4">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100">
                  Atividades secundárias ({c.cnaeSecondary.length})
                </summary>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {c.cnaeSecondary.map((k) => (
                    <li key={k.code}>
                      <span className="font-mono text-xs opacity-60">{formatCnae(k.code)}</span> {k.description}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Glass>
        </div>

        <div className="space-y-4">
          {/* Contatos */}
          <Aura tone="night" className="p-6 text-white">
            <Micro className="!opacity-60">Contatos</Micro>
            <ul className="mt-4 space-y-3 text-sm">
              {c.email && (
                <li>
                  <a href={`mailto:${c.email}`} className="flex items-center gap-3 break-all underline-offset-4 hover:underline">
                    <Mail size={15} aria-hidden className="shrink-0 text-neon" /> {c.email}
                  </a>
                  {tipoEmail && (
                    <span className="ml-7 mt-1 inline-block rounded-full border border-white/20 px-2 py-0.5 text-[10px] opacity-70">
                      {tipoEmail === "contabilidade" ? "provavelmente da contabilidade" : "setor fiscal / tributário"}
                    </span>
                  )}
                </li>
              )}
              {c.phones.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <Phone size={15} aria-hidden className="shrink-0 text-neon" />
                  <a href={`tel:+55${p.replace(/\D/g, "")}`} className="underline-offset-4 hover:underline">
                    {formatPhone(p)}
                  </a>
                </li>
              ))}
              {site_ && (
                <li>
                  <a href={`https://${site_}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 underline-offset-4 hover:underline">
                    <Globe size={15} aria-hidden className="shrink-0 text-neon" /> {site_}
                    <ArrowUpRight size={13} aria-hidden className="opacity-60" />
                  </a>
                </li>
              )}
              {!c.email && !c.phones.length && <li className="opacity-60">Sem contato na base da Receita.</li>}
            </ul>
            <p className="mt-5 text-xs leading-relaxed opacity-50">
              E-mail e telefone declarados à Receita; o site é deduzido do domínio do e-mail. Contatos diretos dos decisores exigem um serviço de enriquecimento (próxima fase).
            </p>
          </Aura>

          {/* Próximos passos (CRM) */}
          <Glass className="p-6">
            <Micro>Próximos passos</Micro>
            <ol className="mt-4 space-y-4">
              {proximosPassos.map((s, i) => (
                <li key={s.t} className="flex gap-3">
                  {s.feito ? (
                    <CheckCircle2 size={20} aria-hidden className="shrink-0 text-emerald-600" />
                  ) : (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-night/30 font-mono text-[10px]">{i + 1}</span>
                  )}
                  <span>
                    <span className="block text-sm font-medium leading-tight">{s.t}</span>
                    <span className="block text-xs opacity-60">{s.d}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Glass>

          <Micro className="px-1">Fonte: Receita Federal, competência {c.sourcePeriod}</Micro>
        </div>
      </div>
    </>
  );
}
