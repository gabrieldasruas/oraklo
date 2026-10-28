# Documentação

- [PLANO_BACKEND.md](PLANO_BACKEND.md): arquitetura, modelo de dados, pipelines (Receita, coleta, verificação) e fases do backend.
- [BACKEND_DEV.md](BACKEND_DEV.md): configurar o `.env.local`, aplicar migrations e rodar a importação da Receita.
- [VERSIONAMENTO_GIT.md](VERSIONAMENTO_GIT.md): branches, commits e fluxo de releases.
- [custos-por-cliente.xlsx](custos-por-cliente.xlsx): custo e margem por cliente em cada pacote (IA, e-mail, decisores e infra), com premissas editáveis.

## Tarefas do backend: quadro do Trello

As tarefas do backend ficam no quadro [Oraklo - Backend](https://trello.com/b/2ubwKvUR/oraklo-backend). **O quadro é a fonte do que fazer e em que ordem**; o [PLANO_BACKEND.md](PLANO_BACKEND.md) explica o porquê (arquitetura e decisões).

- **Antes de começar:** pegue um card de "A fazer", mova para "Em andamento" e coloque seu nome nele. Leia o card inteiro: ele traz como está hoje, o que fazer, os cuidados, o critério de pronto e os arquivos envolvidos.
- **Card em "Decisões pendentes" não se implementa.** Decida com o time, registre a escolha num comentário do card e no `PLANO_BACKEND.md`, e só então abra o card de implementação.
- **Card que depende de outro** (seção "Depende de") só começa quando o outro estiver em "Concluído".
- **Ao abrir o PR**, coloque o link dele no card. Ao fazer o merge, mova o card para "Concluído".
- **Se o código não bater com o card** (algo já feito, arquivo que mudou), atualize o card antes de seguir.
- Trabalho novo que surgir vira card em "Backlog", com o mesmo formato dos demais.
