import {
  LayoutDashboard,
  Users,
  Layers,
  Building2,
  Mail,
  BarChart3,
  MapPinned,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  desc: string;
};

// Seções principais, exibidas no painel do topo.
export const appNav: NavItem[] = [
  { label: "Visão geral", href: "/painel", icon: LayoutDashboard, desc: "Resumo do mês" },
  { label: "Leads", href: "/leads", icon: Users, desc: "Contatos salvos" },
  { label: "Segmentação", href: "/segmentacao", icon: Layers, desc: "Nichos de mercado" },
  { label: "Empresas", href: "/empresas", icon: Building2, desc: "Busca na base" },
  { label: "Busca avançada", href: "/busca-avancada", icon: MapPinned, desc: "Raio no mapa" },
  { label: "Sequências", href: "/sequencias", icon: Mail, desc: "Cadências" },
  { label: "Relatórios", href: "/relatorios", icon: BarChart3, desc: "Desempenho" },
];

// Páginas de apoio: continuam existindo, mas ficam fora do painel para não poluir.
export const secondaryNav = [
  { label: "Listas", href: "/listas" },
  { label: "Configurações", href: "/configuracoes" },
  { label: "Produto", href: "/produto" },
  { label: "Histórias", href: "/historias" },
  { label: "Preços", href: "/precos" },
];
