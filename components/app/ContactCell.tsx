"use client";

import { useState } from "react";
import { Check, Copy, Mail, MessageCircle, Phone } from "lucide-react";
import { formatPhone } from "@/lib/format";

// Botão de copiar com confirmação visual.
function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={done ? "Copiado" : `Copiar ${label}`}
      title={done ? "Copiado!" : `Copiar ${label}`}
      onClick={async (e) => {
        e.preventDefault();
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {}
      }}
      className={`flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all ${
        done ? "bg-neon text-night" : "text-night/45 opacity-0 hover:bg-night hover:text-white group-hover/chip:opacity-100 focus-visible:opacity-100"
      }`}
    >
      {done ? <Check size={14} aria-hidden /> : <Copy size={13} aria-hidden />}
    </button>
  );
}

/**
 * Contato de uma empresa: e-mail e telefone em "chips" clicáveis
 * (abrem o e-mail / ligação / WhatsApp) com botão de copiar.
 */
export default function ContactCell({ email, phones, inline = false }: { email: string | null; phones: string[]; /** chips lado a lado (listas compactas) */ inline?: boolean }) {
  const [first, ...rest] = phones;
  const digits = first?.replace(/\D/g, "") ?? "";
  // celulares (11 dígitos com 9 na frente) podem abrir no WhatsApp
  const isMobile = digits.length === 11 && digits[2] === "9";

  if (!email && !first) {
    return (
      <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-dashed border-night/15 px-3 text-xs opacity-50">
        Sem contato público
      </span>
    );
  }

  return (
    <div className={inline ? "flex flex-wrap gap-1.5" : "flex min-w-[15rem] flex-col gap-1.5"}>
      {email && (
        <div className="group/chip flex items-center gap-1 rounded-full border border-night/10 bg-white/70 py-1 pl-1 pr-1 transition-colors hover:border-night/25 hover:bg-white">
          <a href={`mailto:${email}`} className="flex min-w-0 flex-1 items-center gap-2.5" title={`Enviar e-mail para ${email}`}>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-night text-neon">
              <Mail size={13} aria-hidden />
            </span>
            <span className="truncate text-xs font-medium lowercase">{email}</span>
          </a>
          <CopyButton value={email} label="e-mail" />
        </div>
      )}
      {first && (
        <div className="group/chip flex items-center gap-1 rounded-full border border-night/10 bg-white/70 py-1 pl-1 pr-1 transition-colors hover:border-night/25 hover:bg-white">
          <a href={`tel:+55${digits}`} className="flex min-w-0 flex-1 items-center gap-2.5" title="Ligar">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-neon text-night">
              <Phone size={13} aria-hidden />
            </span>
            <span className="font-mono text-xs tabular-nums">{formatPhone(first)}</span>
            {rest.length > 0 && (
              <span
                className="rounded-full bg-night/8 px-2 py-0.5 font-mono text-[10px] opacity-70"
                title={rest.map(formatPhone).join(" · ")}
              >
                +{rest.length}
              </span>
            )}
          </a>
          {isMobile && (
            <a
              href={`https://wa.me/55${digits}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir no WhatsApp"
              title="Abrir no WhatsApp"
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-500 hover:text-white"
            >
              <MessageCircle size={14} aria-hidden />
            </a>
          )}
          <CopyButton value={formatPhone(first)} label="telefone" />
        </div>
      )}
    </div>
  );
}
