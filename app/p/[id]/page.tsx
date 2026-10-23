import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/db/admin";
import { PORTFOLIO_TAG, completar, type Portfolio } from "@/lib/portfolio-types";
import Slides from "@/components/portfolio/Slides";
import RegistrarVisita from "@/components/portfolio/RegistrarVisita";
import { LIMITES } from "@/lib/pacotes";
import { planoDe } from "@/lib/planos";

// Portfólio público (link compartilhável). Só aparece se o dono ligou "Link público".

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function carregar(id: string): Promise<Portfolio | null> {
  return (await carregarComPlano(id))?.p ?? null;
}

async function carregarComPlano(id: string): Promise<{ p: Portfolio; semMarca: boolean } | null> {
  if (!UUID.test(id)) return null;
  const db = createAdminClient();
  const { data } = await db.from("lists").select("filter, workspace_id").eq("id", id).eq("tag", PORTFOLIO_TAG).maybeSingle();
  const p = data ? completar(data.filter as Partial<Portfolio>) : null;
  if (!p?.compartilhar?.ativo) return null;
  const { data: ws } = await db.from("workspaces").select("plan").eq("id", data!.workspace_id).maybeSingle();
  return { p, semMarca: LIMITES[planoDe(ws?.plan as string | undefined)].semMarca };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await carregar((await params).id);
  if (!p) return { title: "Portfólio", robots: { index: false } };
  return { title: `${p.identidade.empresa} — Portfólio`, description: p.identidade.tagline, robots: { index: false } };
}

export default async function PortfolioPublico({ params, searchParams }: Props) {
  const { id } = await params;
  const { l } = await searchParams;
  const r = await carregarComPlano(id);
  if (!r) notFound();
  const { p, semMarca } = r;
  const i = p.identidade;
  const zap = i.telefone.replace(/\D/g, "");

  return (
    <main className="min-h-screen bg-night px-4 py-8 text-white sm:px-8 sm:py-12">
      <RegistrarVisita portfolioId={id} leadId={typeof l === "string" ? l : null} />
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {i.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.logo} alt="" className="size-11 rounded-xl bg-white object-contain p-1" />
            ) : (
              <span className="flex size-11 items-center justify-center rounded-xl font-medium text-night" style={{ background: i.cor }}>
                {i.empresa.slice(0, 1)}
              </span>
            )}
            <div>
              <p className="text-lg font-medium leading-tight">{i.empresa}</p>
              <p className="text-xs text-white/50">{i.tagline}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {i.email && (
              <a href={`mailto:${i.email}`} className="flex min-h-10 items-center rounded-full px-5 text-sm font-medium text-night" style={{ background: i.cor }}>
                Falar com {i.nome.split(" ")[0]}
              </a>
            )}
            {zap.length >= 10 && (
              <a href={`https://wa.me/55${zap}`} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center rounded-full border border-white/20 px-5 text-sm hover:bg-white/10">
                WhatsApp
              </a>
            )}
          </div>
        </header>

        <Slides p={p} />

        {!semMarca && <footer className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">Apresentação criada com Oraklo</footer>}
      </div>
    </main>
  );
}
