# LAZY DOCS

- [ ] ver um jeito pratico de ter o framework do POR por aqui ou algo customizavel 
- [ ] ter um claude.md proprio da extensao onde vamos falar dos arquivos importantes api/cicd é onde ta a infra etc
- [ ] ter um arquivo de "expected use cases" onde vamos falar como o repo deveria se comportar e ter IA para validar isso 
  - ex: ao fazer um booking, podemos fazer refund em até 7d depois da compra
  - ai a IA vai verificar se isso ta acontecendo (dar um jeito de cachear a solucao/analise) e ver se temos um test case para isso
  - talvez ter um arquivo desse por branch -> vai ajudar a cobrir todos os usecases e expeceted behaviors 
- [ ] criar um prompt para revisar pr no kouto -> seleciono PR e ja era -> pegar ultimos 200 prs e os coments la 
- [ ] adicionar project rules (endpoint create etc)
- [ ] adicionar project agents 
- [ ] ter codebase rules (tipo ter um arquivo para vscode utils)
- [ ] ter um codebase patterns (swr, endpoints, etc)

## CLAUDE CODE MANAGER

- [ ] ter uma view de custom commands
- [ ] ter um view de flags de calude code
- [ ] uma vez por semana analisar o projeto, sugerir PR, etc
- [ ] parsear a sessao -> pedir para ia agrupar chats do mesmo assunto -> sumarizar so oq eu tenho interesse ou mostrar a conversa por topicos

## CLAUDE 

- [ ] ver com claude code como pedir para ele me perguntar me dando opcoes igual acontece no plan mode

## AUTO CLAUDE

- rodar tasks de 5 em 5 horas de forma randomica
  - revisar PR 
  - revisar issues

## PROJECT PANEL

## prompts 

- [ ] ter um changes-review vinculado a branch para ser facil de feedar novas secoes do claude code
- [ ] find test cases
- [ ] adicionar prompt de revisar pr/branch

## TOOLS 

- [ ] modificar a db-query para todas as queries serem salvas em um .md com query e response para a gente ter um tracking disso e poder marcar
- [ ] o linear-cmd deve ser possivel de baixar essas imagens aqui https://uploads.linear.app/2e38837f-37e7-456b-83f7-9fd2f0478e3f/52b47afe-8787-44d7-84ba-559c0209a088/fe0ae9f1-410f-4eea-bf39-3183e85e7bd5 

## PLUGINS

- [ ] plugin para pedir para ia analiser e resumir oq cada commit fez -> se nao tem novo commit nao analisa

## TODO

- [ ] adicionar inline link para abrir issue do linear
- [ ] comand de branch-tasks tao errados, deveriam usar metodos de providers
- [ ] deve dar um toast de error quando o replacement nao substituir de fato
- [ ] criar algo para lsitar edge cases da branch
- [ ] corrigir devpanel tasks view -> open confgig nao funcionando para custom path
- [ ] milestones devem ter cores
- [ ] criar um botao de popular requirements / notes etc a partir do linear / pr info
- [ ] botao de IA para a gente preencher os dados do markdown com ia 
