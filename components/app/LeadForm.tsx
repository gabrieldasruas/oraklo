"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { STATUSES, type LeadInput, type Status } from "@/lib/lead-types";
import { Micro, Pill } from "@/components/app/ui";

type Data = LeadInput;

const field =
  "mt-2 min-h-12 w-full rounded-2xl border border-night/10 bg-white/80 px-4 text-sm";

export default function LeadForm({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Data) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const score = Math.min(100, Math.max(0, Number(get("score")) || 0));
    onSave({
      name: get("name"),
      role: get("role"),
      company: get("company"),
      email: get("email"),
      phone: get("phone"),
      place: get("place"),
      status: get("status") as Status,
      score,
    });
    e.currentTarget.reset();
    onClose();
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="lead-form-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-[28px] border border-white/70 bg-papel-cinza p-0 font-display text-night shadow-2xl backdrop:bg-night/50 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit} className="p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Micro>Cadastro</Micro>
            <h2 id="lead-form-title" className="mt-2 text-4xl font-medium tracking-[-0.045em]">
              Novo lead
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/80 hover:bg-night hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium sm:col-span-2">
            Nome *
            <input name="name" required maxLength={80} autoComplete="off" className={field} />
          </label>
          <label className="block text-sm font-medium">
            Cargo
            <input name="role" maxLength={80} className={field} />
          </label>
          <label className="block text-sm font-medium">
            Empresa *
            <input name="company" required maxLength={80} className={field} />
          </label>
          <label className="block text-sm font-medium">
            E-mail
            <input name="email" type="email" maxLength={120} className={field} />
          </label>
          <label className="block text-sm font-medium">
            Telefone
            <input name="phone" type="tel" maxLength={30} className={field} />
          </label>
          <label className="block text-sm font-medium">
            Localização
            <input name="place" maxLength={80} placeholder="Cidade, UF" className={field} />
          </label>
          <label className="block text-sm font-medium">
            Status
            <select name="status" defaultValue="Novo" className={field}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Score (0–100)
            <input name="score" type="number" min={0} max={100} defaultValue={50} className={field} />
          </label>
        </div>

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          <Pill tone="ghost" onClick={onClose} className="pr-1.5">
            Cancelar
          </Pill>
          <Pill type="submit">Salvar lead</Pill>
        </div>
      </form>
    </dialog>
  );
}
