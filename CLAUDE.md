@AGENTS.md

## Git

- Antes de qualquer alteração, rode `git fetch` e confira com `git status -sb` se a branch atual está atrás do remoto ou da `main`. Se estiver desatualizada, atualize (`git pull` / rebase na `main`) antes de editar — o repositório é compartilhado com outro colaborador.

## Cores

- Todas as cores ficam em `lib/colors.ts`. Nunca escreva hex, `rgb()`/`rgba()` ou tons soltos do Tailwind (`rose-600`, `emerald-700`…) direto num componente: use um nome de `lib/colors.ts` (`bg-neon`, `text-danger-600`, `var(--color-night)`) ou crie um novo lá.
- Em código (canvas, 3D, mapa, SVG, e-mail) importe `cores`, `comAlfa` ou `misturar` de `@/lib/colors`.
- `app/cores.css` é gerado por `npm run cores` (roda sozinho antes do `dev` e do `build`); não edite à mão.
- Modo escuro: os valores ficam em `coresEscuras` (`lib/colors.ts`) e valem dentro de `.tema-app` (o painel). Elemento com fundo colorido fixo (chip com cor por `style`, ilustração, slide) leva a classe `tema-original` para manter as cores originais no escuro.
