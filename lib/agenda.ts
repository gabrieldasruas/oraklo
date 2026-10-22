// Reunião → Google Agenda (link de modelo) e arquivo .ics (Outlook, Apple, qualquer agenda).

type ReuniaoAgenda = { id: string; title: string; start: string; end: string; notes?: string };
type Convidado = { name: string; email: string; company: string } | undefined;

const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Abre o Google Agenda com o evento preenchido (o Meet pode ser ativado com um clique ao salvar). */
export function linkGoogleAgenda(r: ReuniaoAgenda, lead?: Convidado) {
  const detalhes = [r.notes, lead ? `Com ${lead.name} (${lead.company})` : "", "Agendado pelo Oraklo"].filter(Boolean).join("\n\n");
  const q = new URLSearchParams({ action: "TEMPLATE", text: r.title, dates: `${utc(r.start)}/${utc(r.end)}`, details: detalhes });
  if (lead?.email) q.set("add", lead.email);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const escIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);

export function arquivoIcs(r: ReuniaoAgenda, lead?: Convidado) {
  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Oraklo//CRM//PT-BR",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${r.id}@oraklo`,
    `DTSTAMP:${utc(new Date().toISOString())}`,
    `DTSTART:${utc(r.start)}`,
    `DTEND:${utc(r.end)}`,
    `SUMMARY:${escIcs(r.title)}`,
    `DESCRIPTION:${escIcs([r.notes, lead ? `Com ${lead.name} (${lead.company})` : ""].filter(Boolean).join("\n\n"))}`,
    ...(lead?.email ? [`ATTENDEE;CN=${escIcs(lead.name)};RSVP=TRUE:mailto:${lead.email}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return linhas.join("\r\n");
}

/** Baixa o .ics no navegador. */
export function baixarIcs(r: ReuniaoAgenda, lead?: Convidado) {
  const blob = new Blob([arquivoIcs(r, lead)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${r.title.replace(/[^\w\- ]+/g, "").trim() || "reuniao"}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
