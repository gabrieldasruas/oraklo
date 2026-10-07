import type { Metadata } from "next";
import { site } from "@/content/site";
import LeadsView from "@/components/app/LeadsView";

export const metadata: Metadata = { title: `Leads — ${site.name}` };

export default function LeadsPage() {
  return <LeadsView />;
}
