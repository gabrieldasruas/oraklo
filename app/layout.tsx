import type { Metadata } from "next";
import { Outfit, Inter_Tight, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { site } from "@/content/site";

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display-app",
});

// Serifada dos títulos do portfólio (como nas referências "Design Portfolio")
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif-app",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-app",
});

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  openGraph: { title: site.title, description: site.description, type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${display.variable} ${mono.variable} ${serif.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
