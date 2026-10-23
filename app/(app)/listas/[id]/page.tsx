import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { site } from "@/content/site";
import { requireUser } from "@/lib/auth";
import { getList, getListCnpjs, getQuotaUsage } from "@/lib/lists";
import { createAdminClient } from "@/lib/db/admin";
import { formatCnpj, formatMoney, SIZE_LABEL, titleCase } from "@/lib/format";
import { deleteList } from "@/app/(app)/listas/actions";
import ExportButton from "@/components/app/ExportButton";
import ConfirmSubmit from "@/components/app/ConfirmSubmit";
import { Glass, Micro } from "@/components/app/ui";

export const metadata: Metadata = { title: `Lista — ${site.name}` };

const PAGE = 50;

export default async function ListaPage({ params, searchParams }: PageProps<"/listas/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const pageParam = Number((await searchParams).pagina);
  const pageNum = Number.isInteger(pageParam) && pageParam > 1 ? pageParam : 1;

  const list = await getList(id); // RLS: lista de outro workspace → null
  if (!list) notFound();

  const [cnpjs, usage] = await Promise.all([
    getListCnpjs(id, (pageNum - 1) * PAGE, pageNum * PAGE - 1),
    getQuotaUsage(user.workspaceId),
  ]);
  const { data } = cnpjs.length
    ? await createAdminClient()
        .from("companies")
        .select("cnpj, trade_name, legal_name, uf, size, share_capital, receita_email, receita_phones")
        .in("cnpj", cnpjs)
    : { data: [] };
  const byCnpj = new Map((data ?? []).map((c) => [c.cnpj as string, c]));
  const rows = cnpjs.map((c) => byCnpj.get(c)).filter(Boolean);
  const pages = Math.max(1, Math.ceil(list.count / PAGE));

  return (
    <>
      <div className="px-1 pt-4">
        <Link href="/listas" className="inline-flex min-h-11 items-center gap-2 text-sm opacity-70 hover:opacity-100">
          <ArrowLeft size={16} aria-hidden /> Todas as listas
        </Link>
      </div>
      <header className="flex flex-wrap items-end justify-between gap-6 px-1 pb-6 pt-2 md:pb-8">
        <div className="min-w-0">
          <Micro>{list.tag ?? "Lista"} · criada em {new Date(list.createdAt).toLocaleDateString("pt-BR")}</Micro>
          <h1 className="mt-3 text-4xl font-medium leading-[0.95] tracking-[-0.045em] md:text-6xl">{list.name}</h1>
          <p className="mt-3 text-sm opacity-60">
            {list.count.toLocaleString("pt-BR")} empresas · cota do mês: {usage.used.toLocaleString("pt-BR")} de{" "}
            {usage.quota.toLocaleString("pt-BR")} linhas exportadas
          </p>
        </div>
        <ExportButton listId={list.id} rows={list.count} />
      </header>

      <Glass className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <caption className="sr-only">Empresas da lista</caption>
            <thead>
              <tr className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">
                <th scope="col" className="px-6 py-4 font-normal">Empresa</th>
                <th scope="col" className="px-4 py-4 font-normal">UF</th>
                <th scope="col" className="px-4 py-4 font-normal">Porte</th>
                <th scope="col" className="px-4 py-4 text-right font-normal">Capital</th>
                <th scope="col" className="px-4 py-4 font-normal">Contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-night/10 border-t border-night/10">
              {rows.map((c) => (
                <tr key={c!.cnpj} className="hover:bg-white/60">
                  <td className="px-6 py-4">
                    <Link href={`/empresas/${c!.cnpj}`} className="block font-medium underline-offset-4 hover:underline">
                      {titleCase(c!.trade_name ?? c!.legal_name ?? c!.cnpj)}
                    </Link>
                    <span className="block font-mono text-[11px] opacity-55">{formatCnpj(c!.cnpj)}</span>
                  </td>
                  <td className="px-4 py-4 opacity-70">{c!.uf}</td>
                  <td className="px-4 py-4 opacity-70">{SIZE_LABEL[c!.size ?? ""] ?? "—"}</td>
                  <td className="px-4 py-4 text-right font-mono text-xs tabular-nums">
                    {formatMoney(c!.share_capital === null ? null : Number(c!.share_capital))}
                  </td>
                  <td className="px-4 py-4">
                    <span className="flex gap-2 opacity-70">
                      {c!.receita_email && <Mail size={15} aria-label="Tem e-mail" />}
                      {(c!.receita_phones as string[]).length > 0 && <Phone size={15} aria-label="Tem telefone" />}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.count === 0 && <p className="px-5 py-14 text-center text-sm opacity-60">Esta lista está vazia.</p>}
        {pages > 1 && (
          <nav aria-label="Paginação" className="flex items-center justify-between gap-3 border-t border-night/10 p-4 text-sm">
            {pageNum > 1 ? (
              <Link href={`/listas/${id}?pagina=${pageNum - 1}`} className="flex min-h-11 items-center rounded-full border border-night/15 bg-white/60 px-5">
                Anterior
              </Link>
            ) : (
              <span />
            )}
            <Micro>
              Página {pageNum} de {pages}
            </Micro>
            {pageNum < pages ? (
              <Link href={`/listas/${id}?pagina=${pageNum + 1}`} className="flex min-h-11 items-center rounded-full bg-night px-5 font-medium text-white">
                Próxima
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </Glass>

      <form action={deleteList} className="mt-8 flex justify-end">
        <input type="hidden" name="id" value={list.id} />
        <ConfirmSubmit
          message={`Excluir a lista "${list.name}"? As empresas continuam na base.`}
          className="min-h-11 cursor-pointer rounded-full border border-danger-300 px-5 text-sm text-danger-800 hover:bg-danger-50"
        >
          Excluir lista
        </ConfirmSubmit>
      </form>
    </>
  );
}
