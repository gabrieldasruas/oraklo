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

### Gotchas do arquivo

- **Formato:** CSV com `;`, campos entre aspas, codificação Latin-1, sem cabeçalho e com vírgula decimal no capital social.
- **Situação cadastral:** vem com dois dígitos (`02` = ativa).
- **Municípios:** os códigos são da própria Receita, não do IBGE. A UF não vem no arquivo `Municipios` e é preenchida a partir dos estabelecimentos.
- **MEI:** a razão social termina com o CPF do titular. O import remove esse número (LGPD).
- **Layout:** cada linha tem o número de colunas conferido. Se a Receita mudar o layout, a importação aborta antes de gravar.
