# Plano de implementação: backend do Prospecta

Objetivo: substituir os dados fictícios de `content/*.ts` e o `localStorage` de `lib/leads.ts` por uma base real de empresas brasileiras. Nessa base, o usuário segmenta por nicho, monta listas, coleta e verifica contatos e, numa fase posterior, dispara sequências.

## 1. Escopo

**Dentro do MVP (fases 1 a 3):**
- Login e workspaces (um time por empresa cliente).
- Base de empresas importada dos dados abertos de CNPJ da Receita Federal.
- Nichos com contagens reais e busca com filtros.
- Listas e leads persistidos no banco.
- Exportação em CSV.
- Coleta de e-mail e telefone pelo site da empresa e verificação de e-mail.
- Score de fit calculado por regras.

**Fora do MVP:**
- Sequências e envio de e-mail (fase 4).
- Integração com CRM e WhatsApp (fase 5).
- Pagamento e planos (fase 5).
- Dados de decisores com cargo. Não existem em fonte pública e dependem de provedor pago (ver seção 9).

## 2. Decisões de arquitetura

| Tema | Escolha | Motivo |
|---|---|---|
| Banco | Postgres no Supabase | Postgres resolve busca e filtros. O Supabase já traz Auth e RLS (controle de acesso por linha) |
| Autenticação | Supabase Auth (e-mail + Google) | Evita construir login do zero |
| API | Route Handlers e Server Actions do próprio Next.js | O mesmo deploy serve o front e a API. Ler `node_modules/next/dist/docs/` antes: o Next 16 tem mudanças incompatíveis |
| Jobs longos | Worker Node separado (`worker/`), com fila `pg-boss` no próprio Postgres | A importação da Receita e a coleta de sites levam de minutos a horas e não cabem numa requisição web. O `pg-boss` dispensa Redis |
| Hospedagem | Web na Vercel. Worker numa VPS ou no Railway/Fly | O worker precisa de processo contínuo, disco temporário para os dumps e de rodar sem limite de tempo |
| Verificação de e-mail | API terceirizada (MillionVerifier, ZeroBounce ou NeverBounce) | Os provedores de nuvem bloqueiam a porta 25, e verificar via SMTP pelo próprio IP leva a listas negras |
| Descoberta de site | Domínio do e-mail da Receita, com a Google Places API como reserva | Combina custo zero com cobertura |
| Coleta | `fetch` + `cheerio`. Playwright só se necessário | É leve e resolve a maioria dos sites institucionais |

### Separação de dados

```
GLOBAL (somente leitura para clientes)        POR WORKSPACE (RLS por membro)
companies, partners, contacts,                workspaces, members, lists, list_items,
cnaes, municipalities, niches                 leads, lead_events, exports, (fase 4) sequences...
```

A base de empresas é compartilhada. O que é de cada cliente (listas, status, anotações) fica isolado por `workspace_id`.

### Estrutura de pastas proposta

```
app/api/...            # Route Handlers (busca, listas, export)
lib/db/                # cliente Supabase (server/browser), tipos gerados
lib/search/            # montagem de filtros → SQL
lib/score.ts           # regras do score de fit
worker/                # processo separado
  index.ts             # registra os jobs no pg-boss
  jobs/import-receita.ts
  jobs/discover-site.ts
  jobs/crawl-contacts.ts
  jobs/verify-email.ts
  jobs/recompute-niches.ts
supabase/migrations/   # SQL versionado
```

### Modo teste (custo zero)

Enquanto não houver orçamento, o backend roda só com recursos gratuitos, para testes internos. A arquitetura e o modelo de dados continuam os mesmos. Mudam a hospedagem, os limites e alguns pipelines, como resume a tabela.

| Peça | Produção (seções acima) | Modo teste |
|---|---|---|
| Banco | Supabase pago | Supabase **plano gratuito** (ver abaixo) |
| Worker | VPS, Railway ou Fly | Roda **na máquina de quem desenvolve** (`npm run worker`), disparado à mão |
| Web | Vercel | `npm run dev` local. A Vercel Hobby (gratuita) só se precisar mostrar a alguém, já que ela não permite uso comercial |
| Base da Receita | Vários nichos e UFs | **1 ou 2 nichos-piloto em 1 UF** (ex.: transportadoras em SC) |
| Descoberta de site | Domínio da Receita + Google Places | Domínio da Receita + **dedução de domínio** (sem Places) |
| Verificação de e-mail | API paga | **Checagem própria** (sintaxe + MX) + créditos gratuitos só para uma amostra |
| Sequências | Caixa do cliente via OAuth | Gmail API com a conta de um de nós, enviando **só para endereços do próprio time** |

**Banco no plano gratuito do Supabase.** Conferir os limites atuais no site antes de começar. Hoje eles incluem banco pequeno (centenas de MB), poucos projetos por conta e pausa do projeto após alguns dias sem uso.
- Isso cabe com folga para 1 ou 2 nichos numa UF, que somam poucas dezenas de milhares de empresas.
- Para importar mais, a alternativa gratuita é o Supabase local via CLI (precisa de Docker). Ele não tem limite de tamanho, mas o banco fica só naquela máquina.
- Recomendação: usar o projeto gratuito na nuvem, porque assim os dois enxergam os mesmos dados, e manter o filtro de importação bem restrito.

**Dedução de domínio (substitui a Google Places API).** O Places exige conta de faturamento com cartão mesmo dentro da cota grátis, por isso fica de fora.
1. Usar o domínio do `receita_email` quando não for webmail nem contabilidade.
2. Se não houver, testar variações do nome fantasia: `nomefantasia.com.br`, `nome-fantasia.com.br`, `nomefantasia.com`.
3. Só aceitar o site se a página citar o CNPJ, a razão social ou o nome fantasia junto com a cidade. Isso evita associar a empresa ao site errado.
4. Esperar cobertura menor que a do Places. Medir na fase 3 é justamente o que vai justificar (ou não) o gasto depois.

**Verificação sem custo.**
- **Checagens que rodam no worker, sem serviço externo:**
  - sintaxe;
  - existência de registro MX no domínio, via DNS (`node:dns`);
  - lista de domínios descartáveis;
  - detecção de e-mail genérico (`contato@`, `comercial@`...).
- **Status gravado:** `mx_ok`, não `valid`. A checagem prova que o domínio recebe e-mail, mas não que a caixa existe.
- **Sem SMTP:** a verificação por SMTP fica fora, porque provedores residenciais bloqueiam a porta 25 e o IP de casa entra em lista negra.
- **Créditos gratuitos:** os planos grátis dos verificadores (ZeroBounce, NeverBounce, Hunter etc.) dão algumas centenas de créditos. Usar só numa amostra de cerca de 100 e-mails, para medir quantos `mx_ok` são de fato válidos.
- **Adiado para depois do orçamento:** a dedução de e-mail do sócio (fase 3b). Sem verificação de caixa, ela gera endereços inválidos demais.

**Sequências em teste.**
- Nada de envio para leads reais enquanto não houver verificação de verdade. Um bounce alto queima a conta de Gmail usada.
- A fase 4 é validada enviando para caixas do próprio time e testando o fluxo completo: envio, resposta, pausa automática e descadastro.

**O que muda nas fases:**
- **Fase 1:** importar só o nicho-piloto numa UF.
- **Fase 3:** o critério de aceite passa a medir site encontrado, e-mail encontrado e `mx_ok`, além da taxa de válidos na amostra verificada.
- **Fase 5 (cobrança):** fica para depois.

Tudo o mais segue igual. Sair do modo teste é trocar configuração e ligar as APIs pagas, sem reescrever código.

## 3. Modelo de dados

O SQL é indicativo e será fechado nas migrations. Os tipos seguem os nomes já usados no front (`Lead`, `Status`).

```sql
-- Tabelas de referência (Receita)
cnaes(code text pk, description text)
municipalities(code text pk, name text, uf char(2))

-- Empresa = estabelecimento (CNPJ completo de 14 dígitos)
companies(
  cnpj char(14) pk,
  cnpj_root char(8),              -- cnpj_basico (liga com sócios e razão social)
  legal_name text, trade_name text,
  is_headquarters bool,
  status text,                    -- situação cadastral ('02' = ativa)
  opened_at date,
  cnae_main text references cnaes,
  cnae_secondary text[],
  uf char(2), municipality_code text, district text, zip text,
  size text,                      -- porte: ME, EPP, DEMAIS
  share_capital numeric,
  legal_nature text,
  receita_email text, receita_phones text[],
  website text, website_source text,       -- preenchido no enriquecimento
  fit_score smallint,
  updated_at timestamptz
)
-- índices: (cnae_main, uf), GIN(cnae_secondary), (uf, municipality_code), (size), trigram em trade_name/legal_name

partners(id pk, cnpj_root char(8), name text, role text, entered_at date, age_range text)

-- Contatos coletados (e-mail/telefone), com origem rastreável (exigência da LGPD)
contacts(
  id pk, cnpj char(14) references companies,
  kind text,                      -- email | phone
  value text,
  category text,                  -- generic (contato@) | personal (nome@)
  source text,                    -- receita | website | pattern | provider
  source_url text,
  verification text,              -- valid | invalid | catch_all | unknown | mx_ok | pending
  verified_at timestamptz,
  opted_out bool default false,
  unique (cnpj, kind, value)
)

-- Nicho = filtro salvo (substitui `niches` em content/app.ts)
niches(
  id text pk, group_name text, name text, description text, icon text, region text,
  filter jsonb,                   -- { cnaes: [...], ufs: [...], sizes: [...], municipalities: [...] }
  roles text[], tags text[],
  companies_count int, contacts_count int, avg_score smallint, sample_cnpjs text[],
  refreshed_at timestamptz
)

-- Por workspace
workspaces(id pk, name text, plan text, monthly_quota int)
members(workspace_id, user_id, role text)   -- admin | manager | sdr
lists(id pk, workspace_id, name, tag, niche_id null, owner_id, created_at)
list_items(list_id, cnpj, added_at, primary key (list_id, cnpj))
leads(
  id pk, workspace_id, cnpj null, contact_id null,
  name, role, company, email, phone, place,   -- campos do tipo Lead atual (também para leads manuais)
  status text,                                -- 'Novo' | 'Em sequência' | 'Respondeu' | 'Reunião marcada' | 'Sem interesse'
  score smallint, created_at
)
lead_events(id pk, lead_id, type, payload jsonb, created_at)
exports(id pk, workspace_id, list_id, rows int, created_by, created_at)  -- conta para a cota do plano

-- Opt-out global (pedido de exclusão vale para todos os workspaces)
suppressions(value text pk, reason text, created_at)
```

## 4. Pipelines do worker

### 4.1 Importação da Receita (`import-receita`, mensal)

- **Fonte:** portal de dados abertos do CNPJ da Receita Federal, que publica uma pasta por mês com os arquivos `Empresas*`, `Estabelecimentos*`, `Socios*`, `Cnaes`, `Municipios` etc.
- **Formato:** CSV separado por `;`, codificação Latin-1, sem cabeçalho, com o capital social usando vírgula decimal. Conferir o layout no dicionário de dados oficial antes de escrever o parser.

Passos:
1. Baixar os zips da competência, com streaming e sem descompactar tudo no disco de uma vez.
2. Ler `Estabelecimentos*` linha a linha e **filtrar já na leitura**: só empresas ativas cujo CNAE principal ou secundário pertença à lista de CNAEs dos nichos cadastrados. Isso mantém o banco em poucos GB. A base inteira ativa tem dezenas de milhões de linhas e não cabe no plano básico do Supabase.
3. Juntar com `Empresas*` pelo `cnpj_basico` para obter razão social, porte, capital social e natureza jurídica.
4. Carregar `Socios*` só dos `cnpj_basico` importados.
5. Fazer upsert com `COPY` para uma tabela temporária e depois `INSERT ... ON CONFLICT`, em lotes. Nada de inserir linha a linha.
6. Marcar como inativas as empresas que saíram da base. Não apagar, para preservar os leads dos clientes.
7. Disparar `recompute-niches`.

**Critério de aceite:** importar o nicho "Transportadoras em SC" em menos de 30 minutos, com contagem batendo (±1%) com uma consulta manual sobre o arquivo.

### 4.2 Descoberta de site (`discover-site`)

1. Se o domínio de `receita_email` não for de webmail genérico (gmail, hotmail, outlook, yahoo, uol, bol, terra...) nem de escritório de contabilidade já conhecido, testar `https://dominio`.
2. Se não der certo, consultar a Google Places API (Text Search) com nome fantasia + município e usar o campo `website`. Essa API é paga por requisição, então rodar só para empresas que entraram numa lista.
3. Validar que a página responde e que o conteúdo menciona o nome ou o CNPJ. Gravar `website` e `website_source`.

### 4.3 Coleta de contatos (`crawl-contacts`)

1. Baixar a home e até 4 páginas internas cujos links contenham `contato`, `fale-conosco`, `sobre`, `quem-somos` ou `atendimento`.
2. Extrair links `mailto:` e `tel:`, padrões de e-mail no texto (inclusive os ofuscados com "[arroba]") e números de WhatsApp.
3. Classificar cada e-mail como genérico (`contato@`, `comercial@`, `vendas@`...) ou pessoal.
4. Regras de boa conduta:
   - respeitar o `robots.txt`;
   - fazer no máximo 1 requisição por segundo por domínio;
   - usar timeout de 10 s;
   - usar um User-Agent identificável;
   - fazer até 2 novas tentativas.

**Fase 3b (opcional):** gerar padrões de e-mail a partir dos nomes do QSA (`nome@`, `nome.sobrenome@`, `nsobrenome@`), manter só os que passarem na verificação e descartar domínios catch-all.

### 4.4 Verificação (`verify-email`)

- Enviar em lote para a API escolhida e gravar `verification` e `verified_at`.
- Nunca exportar nem enviar para `invalid`. `catch_all` e `unknown` saem com aviso.
- Reverificar e-mails com mais de 90 dias antes de exportar ou enviar.

### 4.5 Score de fit (`lib/score.ts`, recalculado após a importação e o enriquecimento)

Primeira versão por regras, de 0 a 100. Ajustar os pesos com dados reais:

| Sinal | Pontos |
|---|---|
| CNAE do nicho é o principal (não o secundário) | +25 |
| Porte EPP ou DEMAIS | +15 |
| Capital social acima do limiar do nicho | +10 |
| Empresa com mais de 3 anos | +10 |
| Tem site | +10 |
| Tem e-mail verificado | +20 |
| Tem telefone | +10 |

### 4.6 Nichos (`recompute-niches`)

Para cada nicho, executar o filtro e gravar `companies_count`, `contacts_count`, `avg_score` e 3 empresas de exemplo. Os cards do anel de segmentação leem esses números prontos, sem `COUNT` a cada visita.

## 5. API (o que cada tela consome)

| Tela atual | Endpoint / ação | Observação |
|---|---|---|
| Segmentação | `GET /api/niches` | Lê `niches` com as contagens pré-calculadas |
| Busca de empresas (nova, dentro de Segmentação ou Leads) | `GET /api/companies?cnae=&uf=&municipio=&porte=&tem_email=&q=&cursor=` | Paginação por cursor, limite de 50. Sem `OFFSET` grande |
| Detalhe da empresa | `GET /api/companies/:cnpj` | Inclui sócios e contatos verificados |
| Listas | `GET/POST /api/lists`, `POST /api/lists/:id/items` | Adicionar a uma lista enfileira `discover-site` → `crawl-contacts` → `verify-email` |
| Leads | Server Actions `createLead`, `updateLeadStatus`, `deleteLead` | Substitui `useLeads()` de `lib/leads.ts` mantendo a mesma interface |
| Exportar | `POST /api/lists/:id/export` | Gera CSV, desconta da cota e respeita `suppressions` |
| Visão geral / Relatórios | `GET /api/stats?from=&to=` | Agregações sobre `leads` e `lead_events` |
| Opt-out público | `POST /api/opt-out` (página pública `/privacidade/remover`) | Grava em `suppressions` e `contacts.opted_out` |

Toda rota de workspace valida a sessão e depende do RLS como segunda barreira. Nenhuma rota aceita `workspace_id` vindo do cliente sem conferir se o usuário é membro.

## 6. Fases

### Fase 0: Preparação (≈1 dia)
- [ ] Criar o projeto no Supabase (dev e prod) e definir as variáveis em `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`).
- [ ] Configurar a Supabase CLI e as migrations em `supabase/migrations/`.
- [ ] Criar o esqueleto de `worker/` com o `pg-boss` e um job de teste.
- [ ] Definir os 2 ou 3 nichos-piloto com a lista exata de CNAEs (ex.: transportadoras SC = 4930-2/02, 4930-2/03, 4930-2/04).

### Fase 1: Base de empresas e segmentação (≈1 a 2 semanas)
- [ ] Migrations das tabelas globais e índices.
- [ ] `import-receita` filtrado pelos CNAEs dos nichos-piloto.
- [ ] `recompute-niches` e `GET /api/niches`.
- [ ] Trocar `niches` de `content/app.ts` pela API no `SegmentExplorer`, mantendo o mesmo formato `Niche`.
- [ ] Endpoint de busca com filtros e uma tela simples de resultados.

**Aceite:** os cards de Segmentação mostram contagens reais, e a busca devolve empresas reais filtráveis por CNAE, UF, município e porte em menos de 500 ms.

### Fase 2: Contas, listas e leads (≈1 semana)
- [ ] Supabase Auth, login e cadastro, workspace criado no primeiro acesso.
- [ ] Proteger as rotas de `app/(app)` (redirecionar para o login sem sessão).
- [ ] Migrations das tabelas por workspace com RLS e testes de isolamento entre dois workspaces.
- [ ] Trocar `lib/leads.ts` (localStorage) por Server Actions. Os leads de exemplo deixam de existir.
- [ ] Listas reais: criar a partir de um nicho ou de uma busca, adicionar empresas.
- [ ] Exportar CSV com controle de cota.

**Aceite:** dois usuários de workspaces diferentes não enxergam os dados um do outro, e uma lista criada a partir de um nicho pode ser exportada.

### Fase 3: Enriquecimento e score (≈1 a 2 semanas)
- [ ] `discover-site`, `crawl-contacts` e `verify-email` encadeados ao adicionar empresas a uma lista.
- [ ] Status do enriquecimento visível na lista (pendente, encontrado, sem contato).
- [ ] `lib/score.ts` aplicado e exibido no lugar do "Fit" fictício.
- [ ] Página pública de opt-out e tabela `suppressions`.

**Aceite:** num lote de 200 empresas do nicho-piloto, medir e registrar a taxa de site encontrado, de e-mail encontrado e de e-mail válido. Esses números orientam a decisão sobre comprar um provedor pago.

### Fase 4: Sequências (≈2 semanas)
- [ ] Conectar a caixa do próprio usuário via OAuth (Gmail API ou Microsoft Graph). **Não** usar Resend, SES ou SendGrid: as políticas de uso deles proíbem e-mail frio para listas não opt-in.
- [ ] Tabelas `sequences`, `sequence_steps`, `enrollments` e `messages`.
- [ ] Job de envio com limite diário por caixa, janelas de horário e pausa automática quando o lead responde.
- [ ] Detecção de resposta e de bounce lendo a caixa conectada, com atualização do `status` do lead.
- [ ] Link de descadastro em toda mensagem.
- [ ] Relatórios com dados reais.

### Fase 5: Produto comercial
- [ ] Planos e cotas (Essencial, Profissional, Empresarial) com cobrança (Stripe, Mercado Pago ou Asaas).
- [ ] Integração com CRM e WhatsApp.
- [ ] Avaliar um provedor de decisores (ver seção 9).

## 7. Mudanças no frontend

- `content/app.ts`: os dados de `niches`, `lists`, `sequences`, `overview` e `reports` passam a vir da API. Ficam no arquivo só os textos institucionais.
- `lib/leads.ts`: manter a assinatura `useLeads()` → `{ leads, loaded, addLead, removeLead }`, trocando a implementação para chamar Server Actions. Assim, `LeadsView` e `LeadForm` quase não mudam.
- Estados de carregando, vazio e erro em todas as telas que hoje assumem dados estáticos.

## 8. LGPD e conformidade

- **Base legal:** legítimo interesse para prospecção B2B. Documentar o teste de balanceamento (LIA) antes do lançamento.
- **Rastreabilidade:** guardar a origem (`source`, `source_url`) e a data de coleta de cada contato.
- **Direitos do titular:**
  - página pública para pedir exclusão;
  - atendimento em até 15 dias;
  - a exclusão vale para todos os workspaces (`suppressions`).
- **Política de privacidade e termos:** precisam explicar as fontes dos dados (Receita e sites públicos).
- **Dados de sócios:** expor só nome e qualificação. O CPF já vem mascarado da Receita e não deve ser exibido.
- **Textos do front:** revisar os números fictícios ("120M+ contatos verificados", "95% de cobertura") antes de ir ao ar, para não configurar propaganda enganosa.

## 9. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Baixa cobertura de e-mail nos sites | Listas fracas | Medir na fase 3. Se ficar baixa, contratar provedor por demanda |
| Não existem dados de cargo/decisor em fonte pública | Promessa da UI não cumprida | Usar os sócios do QSA como decisores no MVP. Avaliar provedor pago depois |
| Mudança de layout ou URL na Receita | Importação quebra | Validar o número de colunas por linha, alertar e não sobrescrever dados se o arquivo vier incompleto |
| Bloqueio ou reclamação de sites coletados | Reputação | Respeitar robots.txt, usar baixa taxa e User-Agent com contato |
| Domínio do cliente queimado por envio frio | Churn | Limites diários, aquecimento, verificação obrigatória e pausa automática quando os bounces passam de 3% |
| Tamanho do banco | Custo | Importar só os CNAEs dos nichos oferecidos e ampliar sob demanda |

## 10. Pendências de decisão

1. Quais são os 2 ou 3 nichos-piloto e a lista exata de CNAEs de cada um?
2. Supabase está aprovado, ou preferem Postgres próprio?
3. Onde o worker vai rodar (VPS, Railway ou Fly)?
4. ~~Orçamento para APIs pagas~~ Decidido: por enquanto custo zero, só para testes (ver "Modo teste"). Revisar depois das medições da fase 3.
5. As sequências (fase 4) entram no primeiro lançamento, ou o MVP vende só listas e exportação?
