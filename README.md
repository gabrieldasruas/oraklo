# Oraklo

Plataforma de prospecção B2B. Encontra empresas por mapa e raio a partir da base pública de CNPJs, organiza os leads num pipeline e faz o contato por e-mail, WhatsApp e IA, tudo no mesmo lugar.

**Site:** https://oraklo.vercel.app

## Funcionalidades

- **Busca avançada** por mapa e raio, CNAE, porte, capital social e anos de abertura, com perfil de cliente ideal que aprende com 👍/👎
- **Pipeline de vendas** com score de leads, histórico, notas, tarefas e reuniões (Google Agenda e .ics)
- **E-mails em lote** com follow-up automático, rastreio de abertura e descadastro
- **IA (Claude)** para escrever abordagens de e-mail e WhatsApp
- **Integrações:** RD Station CRM direto, webhook (Zapier, Make, n8n) e exportação para planilhas de CRM
- **Relatórios** com gráficos, agrupamentos e exportação CSV
- **Portfólio público** para enviar aos leads, com contagem de visitas
- **Consulta de CNPJ** em páginas públicas indexáveis
- **Pacotes** Grátis, Premium e Ultra com limites de uso

## Tecnologias

| Camada | Escolha |
|---|---|
| Framework | Next.js 16 (App Router, Server Actions) · React 19 · TypeScript |
| Estilo | Tailwind CSS 4 · Motion · Lucide |
| Banco e login | Supabase (Postgres com RLS por workspace) |
| Mapa | Leaflet / React-Leaflet |
| Serviços | Anthropic (Claude) · Resend · Hunter · RD Station CRM |
| Hospedagem | Vercel (deploy e cron diário) |

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as chaves
npm run dev
```

Abra http://localhost:3000.

Scripts úteis:

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run import:receita` | Importa a base de CNPJs da Receita Federal |
| `npm run test:rls` | Testa as regras de segurança do banco |

## Cores

Todas as cores do site ficam em [`lib/colors.ts`](lib/colors.ts). Mudou lá, muda no site inteiro: cada nome vira classe do Tailwind (`bg-neon`, `text-danger-600`) e variável CSS (`var(--color-neon)`). O arquivo `app/cores.css` é gerado a partir dele por `npm run cores`, que roda sozinho antes do `dev` e do `build`.

## Documentação

- [docs/PLANO_BACKEND.md](docs/PLANO_BACKEND.md): arquitetura, modelo de dados e pipelines
- [docs/BACKEND_DEV.md](docs/BACKEND_DEV.md): `.env.local`, migrations e importação da Receita
- [docs/VERSIONAMENTO_GIT.md](docs/VERSIONAMENTO_GIT.md): branches, commits e releases

## Autores

Desenvolvido por [Gabriel Souza](https://github.com/gabrieldasruas) e equipe.
