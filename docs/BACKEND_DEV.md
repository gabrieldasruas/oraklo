# Backend: ambiente de desenvolvimento

Como rodar o banco e a importação da Receita no modo teste. A arquitetura está em [PLANO_BACKEND.md](PLANO_BACKEND.md).

## Configuração

1. Copie `.env.example` para `.env.local` e preencha as 4 variáveis. Cada uma diz onde achar o valor no painel do Supabase.
2. Na `DATABASE_URL`, use o **Session pooler** (porta 5432), no botão **Connect** do projeto. A conexão direta só funciona com IPv6, e o Transaction pooler (6543) não serve para migrations nem para cargas em lote.
3. Rode `npm install`.

## Migrations

O SQL versionado fica em `supabase/migrations/`. Para aplicar no projeto remoto:

```bash
# bash
set -a; . ./.env.local; set +a
npx supabase db push --db-url "$DATABASE_URL"
```

Nunca edite uma migration já aplicada. Para mudar o esquema, crie uma nova com `npx supabase migration new <nome>`.

## Importação da Receita

```bash
npm run import:receita                         # competência mais recente
npm run import:receita -- --periodo=2026-10    # competência específica
npm run import:receita -- --manter-zips        # não apaga os zips (útil para reprocessar)
```

- **O que entra:** só empresas **ativas** que casam com o `filter` de algum nicho da tabela `niches`. Para importar um nicho novo, insira-o em `niches` (via migration) e rode de novo.
- **O que nunca entra:** empresário individual (natureza jurídica `2135`, que inclui quase todo MEI), em qualquer nicho. Os que já estavam no banco ficam `fora_da_base` na próxima importação.
- **Potencial do lead:** a importação grava os estabelecimentos ativos de cada raiz no Brasil e, se houver transporte de cargas (CNAE `4930`), o registro na ANTT (RNTRC). O banco calcula `companies.potential` (A/B/C) a partir disso, e a busca ordena por ele. A regra está na migration `potencial_lead`.
- **Memória:** a contagem de estabelecimentos usa um vetor de 100 MB (1 byte por raiz de CNPJ possível).
- **Duração e disco:** baixa cerca de 7,5 GB, em 35 a 40 minutos a uns 3,5 MB/s. Os zips são baixados um por vez e apagados depois de lidos, então o pico de disco é de uns 2,3 GB (o maior arquivo).
- **Cache:** fica na pasta temporária do sistema (`RECEITA_CACHE_DIR` muda o local). Downloads interrompidos são retomados de onde pararam.
- **Gravação:** acontece numa única transação. Se algo falhar, nada é gravado. Empresas que somem da base não são apagadas, e sim marcadas com `status = 'fora_da_base'`.
- **Conferência:** no fim, o log mostra a contagem de cada nicho no arquivo e no banco. As duas devem bater.

### Fonte dos dados

A Receita publica os arquivos num Nextcloud: `https://arquivos.receitafederal.gov.br/public.php/webdav/Dados/Cadastros/CNPJ/<AAAA-MM>/`. O acesso usa autenticação básica, com o token do compartilhamento público como usuário e senha vazia.

Se o download começar a falhar com 401/404, o token deve ter mudado:
1. Abra https://arquivos.receitafederal.gov.br/ e navegue até Dados › Cadastros › CNPJ.
2. Copie o código que aparece depois de `/index.php/s/` na URL.
3. Defina esse código em `RECEITA_SHARE_TOKEN` no `.env.local`.

O RNTRC vem dos dados abertos da ANTT (CKAN, pacote `b4a055d1-97a2-46f1-9461-cb17fbc6b6b3`): um CSV mensal de uns 160 MB, Latin-1 e com cabeçalho. A importação baixa o mais recente para `<cache>/rntrc/` e só lê as linhas com CNPJ; o CPF do autônomo nem é lido.

### Gotchas do arquivo

- **Formato:** CSV com `;`, campos entre aspas, codificação Latin-1, sem cabeçalho e com vírgula decimal no capital social.
- **Situação cadastral:** vem com dois dígitos (`02` = ativa).
- **Municípios:** os códigos são da própria Receita, não do IBGE. A UF não vem no arquivo `Municipios` e é preenchida a partir dos estabelecimentos.
- **MEI:** a razão social termina com o CPF do titular. O import remove esse número (LGPD).
- **Layout:** cada linha tem o número de colunas conferido. Se a Receita mudar o layout, a importação aborta antes de gravar.

## Login e workspaces

- **Cadastro e workspace:** ao se cadastrar, o usuário ganha um workspace próprio e vira admin dele (trigger `on_auth_user_created`). Um usuário = um workspace por enquanto.
- **Confirmação de e-mail:** o Supabase vem com "Confirm email" ligado. O SMTP embutido dele só entrega para e-mails da equipe do projeto e tem limite de poucos envios por hora. No modo teste, desligue em **Authentication → Sign In / Providers → Email → Confirm email**. Para produção, configure um SMTP próprio.
- **Redirect do link de confirmação:** em **Authentication → URL Configuration**, o *Site URL* e os *Redirect URLs* precisam incluir a URL do app (ex.: `http://localhost:3000/**`). O link cai em `/auth/confirm`.

### Quem lê o quê

| Dado | Acesso |
|---|---|
| `leads`, `lists`, `list_items`, `exports`, `workspaces` | Cliente do usuário (`lib/db/server.ts`), isolado por RLS (`is_member`) |
| `companies`, `partners` | **Só o servidor**, com a service role (`lib/db/admin.ts`), depois de `requireUser()`. Não há policy de leitura para usuários: ler direto pela API do Supabase permitiria baixar a base inteira e contornar a cota de exportação |
| `niches`, `cnaes`, `municipalities` | Leitura para qualquer usuário logado |

- **Funções que mexem com empresas:** criar lista (`create_list_from_filter`) e registrar exportação (`register_export`) são `security definer`. Elas conferem o workspace do usuário e a cota.
- **Teste de isolamento:** `npm run test:rls` cria dois usuários temporários, testa que um não lê, altera nem exporta dados do outro e apaga os dois no fim. Rode depois de qualquer mudança de RLS.

### Gotchas

- **Limite de 1.000 linhas:** a API do Supabase devolve no máximo 1.000 linhas por requisição. Leituras que podem passar disso precisam ser paginadas, como em `getListCnpjs` (listas têm até 5.000 empresas).
- **Idade da empresa:** o critério `min_years_open` dos nichos usa a data de hoje. Por isso uma lista criada agora pode ter algumas empresas a mais que a contagem do card, que só é recalculada na importação.
