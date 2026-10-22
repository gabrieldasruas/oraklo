import type { MetadataRoute } from "next";
import { urlDoApp } from "@/lib/email";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/painel", "/leads", "/busca-avancada", "/empresas", "/listas", "/portfolio", "/relatorios", "/configuracoes", "/segmentacao", "/p/", "/sair"] },
    sitemap: `${urlDoApp()}/sitemap.xml`,
  };
}
