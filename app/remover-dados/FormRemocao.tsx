"use client";

import { startTransition, useActionState, useState } from "react";
import { pedirRemocao, type Estado } from "./acoes";

const TIPOS = [
  { id: "email", rotulo: "Meu e-mail", ajuda: "Ninguém mais envia mensagens para ele pelo Oraklo." },
  { id: "cnpj", rotulo: "Minha empresa", ajuda: "A empresa some da busca, das listas e do pipeline dos clientes." },
  { id: "socio", rotulo: "Meu nome de sócio", ajuda: "Seu nome deixa de aparecer na ficha da empresa." },
] as const;

const campo =
  "mt-2 min-h-12 w-full rounded-2xl border border-white/15 bg-white/[0.06] px-4 text-base text-white placeholder:text-white/35 focus:border-neon focus:outline-none";

export default function FormRemocao() {
  const [estado, enviar, enviando] = useActionState<Estado, FormData>(pedirRemocao, null);
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["id"]>("email");

  if (estado?.ok)
    return (
      <div role="status" className="mt-7 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-white/75">
        Pronto. Enviamos um link de confirmação para o e-mail informado. A remoção vale assim que você confirmar (o link vale por 48 horas).
      </div>
    );

  return (
    // onSubmit em vez de action: o React limparia o formulário depois de cada envio (perde o que foi digitado no erro)
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const dados = new FormData(e.currentTarget);
        startTransition(() => enviar(dados));
      }}
      className="mt-7 space-y-5 text-left"
    >
      <fieldset>
        <legend className="text-sm font-medium">O que você quer remover?</legend>
        <div className="mt-3 grid gap-2">
          {TIPOS.map((t) => (
            <label
              key={t.id}
              className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${tipo === t.id ? "border-neon bg-white/[0.07]" : "border-white/10 hover:border-white/25"}`}
            >
              <input type="radio" name="tipo" value={t.id} checked={tipo === t.id} onChange={() => setTipo(t.id)} className="mt-1 accent-neon" />
              <span>
                <span className="block text-sm font-medium">{t.rotulo}</span>
                <span className="block text-xs text-white/55">{t.ajuda}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {tipo !== "email" && (
        <label className="block text-sm">
          CNPJ da empresa
          <input name="cnpj" inputMode="numeric" autoComplete="off" required placeholder="00.000.000/0000-00" className={campo} />
        </label>
      )}
      {tipo === "socio" && (
        <label className="block text-sm">
          Seu nome completo
          <input name="nome" autoComplete="name" required placeholder="Como está no cadastro da Receita" className={campo} />
        </label>
      )}
      <label className="block text-sm">
        {tipo === "email" ? "E-mail que você quer remover" : "Seu e-mail"}
        <input name="email" type="email" autoComplete="email" required placeholder="voce@empresa.com.br" className={campo} />
        <span className="mt-2 block text-xs text-white/50">Mandamos um link para ele: a remoção só vale depois da sua confirmação.</span>
      </label>
      {/* armadilha para robôs: escondida de quem usa a página */}
      <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {estado?.erro && (
        <p role="alert" className="rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-900">
          {estado.erro}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="min-h-12 w-full cursor-pointer rounded-full bg-neon px-6 text-sm font-medium text-night disabled:cursor-wait disabled:opacity-50"
      >
        {enviando ? "Enviando…" : "Pedir remoção"}
      </button>
    </form>
  );
}
