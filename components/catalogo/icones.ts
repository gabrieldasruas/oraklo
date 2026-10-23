import { Box, BrickWall, CarFront, GlassWater, HardHat, Laptop, Package, PawPrint, Shirt, Sofa, Sparkles, SprayCan, UtensilsCrossed, Wheat, Wine, type LucideIcon } from "lucide-react";

/** Ícone de cada categoria do catálogo (quando o produto não tem foto). */
export const ICONE_CATEGORIA: Record<string, LucideIcon> = {
  bebidas: GlassWater,
  vinhos: Wine,
  alimentos: UtensilsCrossed,
  tecidos: Shirt,
  pneus: CarFront,
  construcao: BrickWall,
  limpeza: SprayCan,
  embalagens: Package,
  beleza: Sparkles,
  uniformes: HardHat,
  escritorio: Laptop,
  moveis: Sofa,
  agro: Wheat,
  pet: PawPrint,
  outro: Box,
};
