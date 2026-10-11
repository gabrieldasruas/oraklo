# Versionamento e fluxo de releases

## Branches

- `main`: producao. Protegida. Deploy automatico.
- `feature/<descricao>`: novas funcionalidades.
- `fix/<descricao>`: correcao pontual.
- `hotfix/<descricao>`: correcao urgente de producao.
- `chore/<descricao>`: manutencao sem mudanca funcional.

Exemplos:

```bash
git checkout -b feature/theme-studio-banners
git checkout -b fix/checkout-cielo-status
git checkout -b hotfix/webhook-mercadopago-assinatura
```

## Commits

Usar mensagens claras:

```txt
feat: adiciona controle de banners no admin
fix: corrige status do pagamento cielo
chore: atualiza documentacao de deploy
security: reforca validacao de licenca
```

## Pull requests

Todo PR deve informar:

- o que mudou;
- como foi testado;
- se altera env;
- se altera deploy;
- se altera licenca/serial;
- se altera dados/banco;
- risco de rollback.

Arquivos protegidos exigem revisao do dono:

- `.github/workflows/**`
- `scripts/deploy/**`
- `license/**`
- `packages/config/src/license.ts`
- `apps/*/src/middleware.ts`
- `.env.example`
- `turbo.json`
- `docker/**`

## Tags de producao

Quando uma versao for publicada e validada, criar tag:

```bash
git tag -a prod-YYYYMMDD-N -m "Producao YYYY-MM-DD N"
git push origin prod-YYYYMMDD-N
```

Exemplo:

```bash
git tag -a prod-20260601-1 -m "Producao 2026-06-01 1"
```

## Rollback

Rollback deve ser feito revertendo commit ou redeployando uma tag aprovada. Nao usar `git reset --hard` em branch compartilhada.

## Secrets

Secrets nunca entram no Git:

- `.env`
- `APP_LICENSE_KEY`
- `APP_LICENSE_MONITOR_TOKEN`
- chaves SSH;
- tokens de gateway;
- credenciais de banco;
- credenciais Cloudflare/R2.

Se um secret entrou no Git, ele deve ser considerado vazado e rotacionado.
