"use client";

import { useCallback, useEffect, useState } from "react";
import { site } from "@/content/site";

export const STATUSES = [
  "Novo",
  "Em sequência",
  "Respondeu",
  "Reunião marcada",
  "Sem interesse",
] as const;

export type Status = (typeof STATUSES)[number];

export type Lead = {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone: string;
  place: string;
  status: Status;
  score: number;
  createdAt: string; // ISO
  last?: string; // texto livre dos exemplos iniciais
};

const KEY = "prospecta:leads:v1";

function seed(): Lead[] {
  const now = new Date().toISOString();
  return site.leadsPage.leads.map((l, i) => ({
    id: `seed-${i}`,
    name: l.name,
    role: l.role,
    company: l.company,
    email: "",
    phone: "",
    place: l.place,
    status: l.status as Status,
    score: l.score,
    createdAt: now,
    last: l.last,
  }));
}

function read(): Lead[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return seed(); // primeira visita: exemplos
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seed();
  } catch {
    return seed();
  }
}

function write(leads: Lead[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(leads));
  } catch {
    // armazenamento indisponível (modo privado, cota cheia): segue só em memória
  }
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Carrega após a hidratação para evitar divergência entre servidor e cliente.
  useEffect(() => {
    setLeads(read());
    setLoaded(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setLeads(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((fn: (prev: Lead[]) => Lead[]) => {
    setLeads((prev) => {
      const next = fn(prev);
      write(next);
      return next;
    });
  }, []);

  const addLead = useCallback(
    (data: Omit<Lead, "id" | "createdAt">) =>
      update((prev) => [
        { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
        ...prev,
      ]),
    [update],
  );

  const removeLead = useCallback(
    (id: string) => update((prev) => prev.filter((l) => l.id !== id)),
    [update],
  );

  return { leads, loaded, addLead, removeLead };
}
