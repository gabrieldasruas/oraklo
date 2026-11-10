import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/content/site";
import FormRemocao from "./FormRemocao";

export const metadata: Metadata = {
  title: `Remover meus dados — ${site.name}`,
  description: `Peça para tirar seu e-mail, sua empresa ou seu nome de sócio da base do ${site.name}.`,
};

export default function RemoverDadosPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-night px-4 py-10 font-display text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-center sm:p-8">
        <span className="mx-auto mb-6 flex size-12 items-center justify-center rounded-2xl bg-neon text-xl font-semibold text-night">O</span>
        <h1 className="text-3xl font-light tracking-[-0.04em]">Remover meus dados</h1>
        <p className="mt-3 text-sm text-white/60">
          O {site.name} usa dados públicos da Receita Federal. Se você não quer ser contatado por nenhum cliente da plataforma, peça aqui. É de graça e vale para
          todos.
        </p>
        <FormRemocao />
        <p className="mt-6 text-xs text-white/45">
          Prefere falar com a gente? Escreva para {site.email}.
        </p>
        <Link href="/privacidade" className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-white">
          Política de privacidade
        </Link>
      </div>
    </main>
  );
}
