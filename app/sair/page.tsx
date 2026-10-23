import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import { tokenValido } from "@/lib/descadastro";
import { confirmarDescadastro } from "./acoes";

export const metadata: Metadata = { title: `Sair da lista — ${site.name}`, robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function SairPage({ searchParams }: Props) {
  const { l = "", t = "", ok, erro } = await searchParams;
  const valido = !!l && !!t && tokenValido(l, t);
  return (
    <main className="flex min-h-screen items-center justify-center bg-night px-5 font-display text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-8 text-center">
        <span className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl bg-neon text-xl font-semibold text-night">O</span>
        {ok ? (
          <>
            <h1 className="text-3xl font-light tracking-[-0.04em]">Pronto, você saiu da lista</h1>
            <p className="mt-3 text-sm text-white/60">Você não vai mais receber e-mails deste remetente enviados pelo {site.name}.</p>
          </>
        ) : valido ? (
          <>
            <h1 className="text-3xl font-light tracking-[-0.04em]">Não quer mais receber estes e-mails?</h1>
            <p className="mt-3 text-sm text-white/60">Confirme e o remetente não poderá mais enviar mensagens para você pelo {site.name}.</p>
            <form action={confirmarDescadastro} className="mt-7">
              <input type="hidden" name="l" value={l} />
              <input type="hidden" name="t" value={t} />
              <button type="submit" className="min-h-12 w-full cursor-pointer rounded-full bg-neon px-6 text-sm font-medium text-night">
                Sair da lista
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-light tracking-[-0.04em]">Link inválido</h1>
            <p className="mt-3 text-sm text-white/60">
              {erro ? "Não foi possível confirmar." : "Este link de descadastro não é válido."} Escreva para {site.email} que removemos você.
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
