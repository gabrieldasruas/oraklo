# Plano de implementação: site de apresentação em Next.js

Baseado na referência visual (EX8): tema escuro, tipografia pixel, divisores pontilhados e ilustrações 3D monocromáticas.

## 1. Leitura da referência

**Estilo visual**
- Fundo preto, texto branco e cinza, sem cor de destaque.
- Tipografia pixel/bitmap nos títulos e nos números. Textos corridos em sans-serif geométrica fina.
- Divisores em linha pontilhada entre as seções.
- Botões retangulares com borda fina e ícone de seta ↗.
- Ilustrações 3D monocromáticas (cubos de vidro, poliedro).

**Seções, de cima para baixo**
1. **Header:** logo à esquerda, "MENU" com ícone hambúrguer à direita.
2. **Hero:** título grande em pixel font, subtítulo, botão "Browse apps" e ilustração 3D à direita.
3. **Recently released:** destaque de um produto. Tem rótulo vertical, imagem, nome, lista de metadados com ícones (plataforma, tipo, formato, descrição) e CTA de compra e de detalhes. Um desenho de contorno do produto fica cortado na borda direita.
4. **Why and how:** logo ou ilustração grande em SVG, texto curto e link "Read about our tech stack".
5. **Stats:** 4 números grandes em pixel font com legenda.
6. **Footer:** links, copyright com e-mail e links legais.

## 2. Stack

| Item | Escolha | Motivo |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Roteamento, SEO e `next/image` e `next/font` prontos |
| Estilo | Tailwind CSS | Resolve bem o layout com bordas e divisores |
| Animação | Motion (framer-motion), usado com moderação | Entrada por scroll e contadores nas stats |
| Ícones | lucide-react | Os ícones lineares dos metadados combinam com a referência |
| Fonte pixel | Pixelify Sans ou Silkscreen (Google Fonts) via `next/font`, ou fonte local | Substitui a fonte pixel da referência |
| Fonte do corpo | Outfit ou Figtree | Parecida com a sans geométrica da referência |
| Deploy | Vercel | Gratuito e com integração direta |

Para o 3D do hero há duas opções:
- **Simples:** imagem ou vídeo/WebP renderizado no Blender ou gerado por IA (recomendado para começar).
- **Interativo:** React Three Fiber com cubos wireframe, mais trabalhoso e pesado.

## 3. Estrutura de pastas

```
prospecao/
├─ app/
│  ├─ layout.tsx            # fontes, metadata, Header/Footer
│  ├─ page.tsx              # monta as seções
│  ├─ globals.css           # tokens (cores, divisores pontilhados)
│  └─ apps/[slug]/page.tsx  # (fase 2) página de detalhe
├─ components/
│  ├─ layout/   Header.tsx, MenuOverlay.tsx, Footer.tsx
│  ├─ sections/ Hero.tsx, FeaturedProduct.tsx, WhyHow.tsx, Stats.tsx
│  └─ ui/       Button.tsx, SectionDivider.tsx, MetaList.tsx, CountUp.tsx
├─ content/site.ts          # textos, produtos e números em um só lugar
├─ public/      images/, svg/
└─ tailwind.config.ts
```

Manter o conteúdo em `content/site.ts` permite trocar os textos sem mexer nos componentes.

## 4. Etapas

### Fase 0: Preparação
- [ ] Instalar Node.js LTS (nodejs.org ou `winget install OpenJS.NodeJS.LTS`) e reabrir o terminal.
- [ ] Remover o `index.html` vazio e criar o projeto na pasta atual: `npx create-next-app@latest . --ts --tailwind --app --eslint`.
- [ ] Rodar `git init` e fazer o primeiro commit.

### Fase 1: Fundação
- [ ] Definir os tokens em `globals.css`: `--bg`, `--fg`, `--muted` e a cor da linha pontilhada.
- [ ] Configurar as fontes com `next/font`.
- [ ] Criar `SectionDivider` (borda `dashed` ou `dotted` de 1px).
- [ ] Criar `Button` com variantes outline e sólido, ambos com seta.

### Fase 2: Layout global
- [ ] `Header` com logo e botão MENU.
- [ ] `MenuOverlay`: tela cheia com links de âncora e fechamento por Esc.
- [ ] `Footer` em 3 colunas, empilhadas no mobile.

### Fase 3: Seções (na ordem da página)
- [ ] **Hero:** título em pixel font com `clamp()` para escalar, subtítulo, CTA e imagem 3D à direita. No mobile a imagem vai para baixo do texto.
- [ ] **FeaturedProduct:** grid de 3 colunas (rótulo vertical, imagem, informações). O rótulo usa `writing-mode: vertical-rl` com rotação. O contorno cortado à direita usa `overflow-hidden` e posicionamento absoluto, e é ocultado no mobile.
- [ ] **WhyHow:** SVG do logo ou padrão geométrico, texto e link.
- [ ] **Stats:** grid 4×1, que vira 2×2 no mobile, com separadores verticais pontilhados.

### Fase 4: Polimento
- [ ] Animações de entrada por scroll (fade e deslocamento leve).
- [ ] Contador animado nas stats.
- [ ] Hover nos botões, com a seta se movendo.
- [ ] Respeitar `prefers-reduced-motion`.

### Fase 5: Qualidade e publicação
- [ ] SEO: `metadata`, Open Graph, `sitemap.ts`, `robots.ts` e favicon.
- [ ] Imagens com `next/image`, em WebP/AVIF e com `alt`.
- [ ] Acessibilidade: contraste, foco visível, `aria-label` no botão do menu e navegação por teclado.
- [ ] Lighthouse acima de 90 em todas as categorias.
- [ ] Deploy na Vercel e domínio próprio.

### Fase 6 (opcional)
- [ ] Páginas de detalhe `/apps/[slug]`.
- [ ] Formulário de contato (Route Handler + Resend).
- [ ] Múltiplos produtos.
- [ ] Idiomas PT/EN com `next-intl`.

## 5. Pontos de atenção

- **Conteúdo e marca:** a referência é de outra empresa (EX8). Use nome, logo, textos e imagens próprios. Copiar assets e identidade traz risco de direitos autorais. O que vale aproveitar é o layout e a linguagem visual.
- **Fonte pixel:** confira a licença de qualquer fonte que baixar.
- **Imagens 3D:** são o ponto que mais pesa na estética. Reserve tempo para gerá-las ou renderizá-las, ou use um placeholder no início.
- **Estimativa:** versão estática completa (fases 0 a 3) em torno de 1 a 2 dias. Com polimento e deploy, de 3 a 4 dias.

## 6. Pendências de definição

1. O que o site vai apresentar: produtos/apps, serviços ou portfólio pessoal? Isso define a seção "Recently released".
2. Logo e nome definidos, ou placeholders por enquanto?
3. Idioma: português, inglês ou ambos?
