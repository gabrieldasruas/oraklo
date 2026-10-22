import type { Metadata } from "next";
import { site } from "@/content/site";
import { faq } from "@/content/app";
import PageHeader from "@/components/app/PageHeader";
import PacotesView from "@/components/app/PacotesView";
import { Glass, Micro } from "@/components/app/ui";

export const metadata: Metadata = {
  title: `Preços — ${site.name}`,
  description: "Free para sempre, Premium a partir de R$ 100 por mês e Ultra com busca sem limite. Compare os pacotes do Oraklo.",
};

export default function PrecosPage() {
  return (
    <>
      <PageHeader index="10" title="Preços" description="Comece grátis, sem cartão. Suba de pacote quando precisar de mais buscas, e-mails e automação." />
      <PacotesView emailContato={site.email} />

      <Micro className="mb-3 mt-12 px-1">Perguntas frequentes · {site.name}</Micro>
      <Glass className="p-2 md:p-3">
        <dl className="divide-y divide-night/10">
          {faq.map((f, i) => (
            <div key={f.q} className="grid gap-2 px-4 py-6 md:grid-cols-[3rem_1fr_1.4fr] md:gap-6">
              <span className="font-mono text-[10px] opacity-40">{String(i + 1).padStart(2, "0")}</span>
              <dt className="text-xl font-medium tracking-[-0.025em]">{f.q}</dt>
              <dd className="text-sm leading-relaxed opacity-60">{f.a}</dd>
            </div>
          ))}
        </dl>
      </Glass>
    </>
  );
}
