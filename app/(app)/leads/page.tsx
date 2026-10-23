import type { Metadata } from "next";
import { site } from "@/content/site";
import LeadsView from "@/components/app/LeadsView";

export const metadata: Metadata = { title: `Leads — ${site.name}` };

type Props = { searchParams: Promise<{ lead?: string }> };

export default async function LeadsPage({ searchParams }: Props) {
  const { lead } = await searchParams;
  // ?lead=<id> abre a ficha do lead (links do sininho de avisos)
  return <LeadsView abrir={typeof lead === "string" ? lead : null} />;
}
