import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Globe, Mail, Phone } from "lucide-react";
import { site } from "@/content/site";
import { requireUser } from "@/lib/auth";
import { getCompany } from "@/lib/companies";
import { formatCnae, formatCnpj, formatMoney, formatPhone, SIZE_LABEL } from "@/lib/format";
import { addCompanyAsLead } from "@/app/(app)/leads/actions";
import { Aura, Glass, Micro, Pill } from "@/components/app/ui";

export const metadata: Metadata = { title: `Empresa — ${site.name}` };

const date = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

export default async function EmpresaPage({ params }: PageProps<"/empresas/[cnpj]">) {
  await requireUser();
  const { cnpj } = await params;
  const c = await getCompany(cnpj);
  if (!c) notFound();

  const facts = [
    { l: "CNPJ", v: formatCnpj(c.cnpj) },
    { l: "Tipo", v: c.isHeadquarters ? "Matriz" : "Filial" },
    { l: "Porte", v: SIZE_LABEL[c.size] ?? "—" },
    { l: "Capital social", v: formatMoney(c.shareCapital) },
    { l: "Abertura", v: date(c.openedAt) },
    { l: "Situação", v: c.status === "02" ? "Ativa" : "Fora da base atual" },
  ];

  return (
    <>
      <div className="px-1 pt-4">
        <Link href="/empresas" className="inline-flex min-h-11 items-center gap-2 text-sm opacity-70 hover:opacity-100">
          <ArrowLeft size={16} aria-hidden /> Voltar à busca
        </Link>
      </div>
      <header className="flex flex-wrap items-end justify-between gap-6 px-1 pb-6 pt-2 md:pb-8">
        <div className="min-w-0">
          <Micro>{c.cnaeMain ? `${formatCnae(c.cnaeMain)} · ${c.cnaeMainDescription ?? ""}` : "Empresa"}</Micro>
          <h1 className="mt-3 text-4xl font-medium leading-[0.95] tracking-[-0.045em] md:text-6xl">{c.name}</h1>
          {c.legalName && c.legalName !== c.name && <p className="mt-3 text-sm opacity-60">{c.legalName}</p>}
        </div>
        <form action={addCompanyAsLead}>
          <input type="hidden" name="cnpj" value={c.cnpj} />
          <Pill type="submit">Adicionar aos leads</Pill>
        </form>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Glass className="p-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
              {facts.map((f) => (
                <div key={f.l}>
                  <dt className="font-mono text-[10px] uppercase tracking-widest opacity-50">{f.l}</dt>
                  <dd className="mt-1 text-base">{f.v}</dd>
                </div>
              ))}
            </dl>
          </Glass>

          <Glass className="p-6">
            <Micro>Endereço</Micro>
            <p className="mt-3 text-base leading-relaxed">
              {c.address ?? "—"}
              {c.district && <> · {c.district}</>}
              <br />
              {[c.city, c.uf].filter(Boolean).join(" / ")}
              {c.zip && <> · CEP {c.zip.replace(/^(\d{5})(\d{3})$/, "$1-$2")}</>}
            </p>
          </Glass>

          {c.cnaeSecondary.length > 0 && (
            <Glass className="p-6">
              <Micro>Atividades secundárias</Micro>
              <ul className="mt-3 space-y-2 text-sm">
                {c.cnaeSecondary.map((k) => (
                  <li key={k.code}>
                    <span className="font-mono text-xs opacity-60">{formatCnae(k.code)}</span> {k.description}
                  </li>
                ))}
              </ul>
            </Glass>
          )}
        </div>

        <div className="space-y-4">
          <Aura tone="night" className="p-6 text-white">
            <Micro className="!opacity-60">Contato da Receita</Micro>
            <ul className="mt-4 space-y-3 text-sm">
              {c.email && (
                <li className="flex items-center gap-3 break-all">
                  <Mail size={15} aria-hidden className="shrink-0 text-neon" />
                  <a href={`mailto:${c.email}`} className="underline-offset-4 hover:underline">{c.email}</a>
                </li>
              )}
              {c.phones.map((p) => (
                <li key={p} className="flex items-center gap-3">
                  <Phone size={15} aria-hidden className="shrink-0 text-neon" />
                  <a href={`tel:+55${p}`} className="underline-offset-4 hover:underline">{formatPhone(p)}</a>
                </li>
              ))}
              {c.website && (
                <li className="flex items-center gap-3">
                  <Globe size={15} aria-hidden className="shrink-0 text-neon" /> {c.website}
                </li>
              )}
              {!c.email && !c.phones.length && <li className="opacity-60">Sem contato na base da Receita.</li>}
            </ul>
            <p className="mt-5 text-xs leading-relaxed opacity-50">
              E-mail e telefone declarados à Receita; podem ser do escritório de contabilidade. A verificação vem na próxima fase.
            </p>
          </Aura>

          <Glass className="p-6">
            <Micro>Sócios (QSA)</Micro>
            {c.partners.length ? (
              <ul className="mt-3 divide-y divide-night/10 text-sm">
                {c.partners.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="flex items-center justify-between gap-3 py-3">
                    <span>{p.name}</span>
                    <span className="shrink-0 font-mono text-[10px] uppercase opacity-50">
                      {p.kind === "PJ" ? "Empresa" : p.enteredAt ? `desde ${p.enteredAt.slice(0, 4)}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm opacity-60">Nenhum sócio informado.</p>
            )}
          </Glass>
          <Micro className="px-1">Fonte: Receita Federal, competência {c.sourcePeriod}</Micro>
        </div>
      </div>
    </>
  );
}
