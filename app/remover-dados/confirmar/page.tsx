import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { pedidoValido } from "@/lib/descadastro";
import { confirmarRemocao } from "../acoes";

export const metadata: Metadata = { title: `Confirmar remoção — ${site.name}`, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

// O link do e-mail só abre esta página: a remoção acontece no botão (antivírus de e-mail abrem links sozinhos).
export default async function ConfirmarRemocaoPage({ searchParams }: Props) {
  const { p = "", t = "", ok, erro, expirou } = await searchParams;
  const valido = !!p && !!t && pedidoValido(p, t);
  return (
    <main className="flex min-h-screen items-center justify-center bg-night px-4 font-display text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-center sm:p-8">
        <span className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl bg-neon text-xl font-semibold text-night">O</span>
        {ok ? (
          <>
            <h1 className="text-3xl font-light tracking-[-0.04em]">Pronto, removemos seus dados</h1>
            <p className="mt-3 text-sm text-white/60">Nenhum cliente do {site.name} poderá mais usar esse dado para contato.</p>
          </>
        ) : expirou ? (
          <>
            <h1 className="text-3xl font-light tracking-[-0.04em]">O link expirou</h1>
            <p className="mt-3 text-sm text-white/60">O link vale por 48 horas. Faça o pedido de novo que mandamos outro.</p>
            <Link href="/remover-dados" className="mt-7 inline-flex min-h-12 items-center rounded-full bg-neon px-6 text-sm font-medium text-night">
              Pedir de novo
            </Link>
          </>
        ) : valido ? (
          <>
            <h1 className="text-3xl font-light tracking-[-0.04em]">Confirmar a remoção?</h1>
            <p className="mt-3 text-sm text-white/60">Depois de confirmar, o dado sai da base do {site.name} para todos os clientes.</p>
            <form action={confirmarRemocao} className="mt-7">
              <input type="hidden" name="p" value={p} />
              <input type="hidden" name="t" value={t} />
              <button type="submit" className="min-h-12 w-full cursor-pointer rounded-full bg-neon px-6 text-sm font-medium text-night">
                Confirmar remoção
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-light tracking-[-0.04em]">Link inválido</h1>
            <p className="mt-3 text-sm text-white/60">
              {erro ? "Não foi possível confirmar." : "Este link de confirmação não é válido."} Escreva para {site.email} que fazemos a remoção.
            </p>
          </>
        )}
        <Link href="/privacidade" className="mt-8 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-white">
          Política de privacidade
        </Link>
      </div>
    </main>
  );
}
