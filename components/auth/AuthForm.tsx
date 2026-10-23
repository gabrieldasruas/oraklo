"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/entrar/actions";
import { Micro, Pill } from "@/components/app/ui";

const field = "mt-2 min-h-12 w-full rounded-2xl border border-night/10 bg-white/80 px-4 text-base";

export default function AuthForm({ next, linkError }: { next: string; linkError: boolean }) {
  const [mode, setMode] = useState<"entrar" | "cadastro">("entrar");
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(signIn, {});
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(signUp, {});
  const signup = mode === "cadastro";
  const state = signup ? signupState : loginState;
  const pending = signup ? signupPending : loginPending;

  return (
    <div className="glass w-full max-w-md p-7 md:p-8">
      <div role="tablist" aria-label="Acesso" className="flex gap-2">
        {(["entrar", "cadastro"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 cursor-pointer rounded-full border px-5 text-sm transition-colors ${
              mode === m ? "border-night bg-night font-medium text-white" : "border-white/70 bg-white/55 hover:bg-white/90"
            }`}
          >
            {m === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      <form action={signup ? signupAction : loginAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        {signup && (
          <>
            <label className="block text-sm font-medium">
              Seu nome
              <input name="name" required maxLength={80} autoComplete="name" className={field} />
            </label>
            <label className="block text-sm font-medium">
              Empresa
              <input name="company" required maxLength={80} autoComplete="organization" className={field} />
            </label>
          </>
        )}
        <label className="block text-sm font-medium">
          E-mail
          <input name="email" type="email" required autoComplete="email" defaultValue={state.email} className={field} />
        </label>
        <label className="block text-sm font-medium">
          Senha
          <input
            name="password"
            type="password"
            required
            minLength={signup ? 8 : undefined}
            autoComplete={signup ? "new-password" : "current-password"}
            className={field}
          />
          {signup && <span className="mt-1.5 block text-xs font-normal opacity-60">Mínimo de 8 caracteres.</span>}
        </label>

        <div aria-live="polite">
          {linkError && !state.error && !state.info && (
            <p role="alert" className="rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-900">
              O link de confirmação é inválido ou expirou. Entre com sua senha ou crie a conta de novo.
            </p>
          )}
          {state.error && (
            <p role="alert" className="rounded-2xl bg-danger-100 px-4 py-3 text-sm text-danger-900">
              {state.error}
            </p>
          )}
          {state.info && <p className="rounded-2xl bg-white/80 px-4 py-3 text-sm">{state.info}</p>}
        </div>

        <Pill type="submit" disabled={pending} className="w-full justify-between">
          {pending ? "Aguarde…" : signup ? "Criar conta" : "Entrar"}
        </Pill>
      </form>
      <Micro className="mt-6">{signup ? "Um workspace é criado para sua empresa." : "Acesso restrito à sua equipe."}</Micro>
    </div>
  );
}
