# LAZY DOCS

- [ ] ver um jeito pratico de ter o framework do POR por aqui ou algo customizavel 
- [ ] ter um claude.md proprio da extensao onde vamos falar dos arquivos importantes api/cicd é onde ta a infra etc
- [ ] ter um arquivo de "expected use cases" onde vamos falar como o repo deveria se comportar e ter IA para validar isso 
  - ex: ao fazer um booking, podemos fazer refund em até 7d depois da compra
  - ai a IA vai verificar se isso ta acontecendo (dar um jeito de cachear a solucao/analise) e ver se temos um test case para isso
  - talvez ter um arquivo desse por branch -> vai ajudar a cobrir todos os usecases e expeceted behaviors 

## CLAUDE CODE MANAGER

- [ ] ter uma view de custom commands
- [ ] ter um view de flags de calude code
- [ ] uma vez por semana analisar o projeto, sugerir PR, etc
- [ ] parsear a sessao -> pedir para ia agrupar chats do mesmo assunto -> sumarizar so oq eu tenho interesse ou mostrar a conversa por topicos

## AUTO CLAUDE

- rodar tasks de 5 em 5 horas de forma randomica
  - revisar PR 
  - revisar issues

## PROJECT PANEL

## prompts 

- [ ] ter um changes-review vinculado a branch para ser facil de feedar novas secoes do claude code
- [ ] find test cases
- [ ] adicionar prompt de revisar pr/branch

## DONE 

- [x] ajeitar o schema do variables[number] pq ta mostrando multiSelect ate quando nao é do tipo files e folders
- [x] adicionar botao no view de variables para ir para as configs.jsonc
- [x] adicionar uma flag para "inlcudes" na selecao de files e fodlers -> no caso de querer considerar so um ou poucos fodlers e files nas opcoes
- [x] remover a necessidade de ter config.tools.command -> ninguem usa esse comando -> mas pensar bem pq pode ser util para todar ali do sidebar e ver se ta tudo certo
- [x] poder habilitar/desabilitar as tools -> adicionar icone para isso ou deixar o padroa ao clicar em cima delas e add icone para rodar a tool

## TOOLS 

- [ ] modificar a db-query para todas as queries serem salvas em um .md com query e response para a gente ter um tracking disso e poder marcar

## TODO

- [ ] ao mudar de branch mostrar algo que vai ser: [ ] feature / [ ] bugfix / [ ] chore / [ ] other
- [ ] ter um registry ou algo assim para adicionar tools nos projetos facilmente
  - prompts
  - tools
  - scripts
- [ ] nao ta dando para atribuir atalho em global prompts/tools/tasks
- [ ] ajeitar o branch tasks para ter status: to do / doing / done 
- [ ] falta adicionar as secoes tasks e notes no branch context menu
- [ ] ver com claude code como pedir para ele me perguntar me dando opcoes igual acontece no plan mode
- [ ] plugin para pedir para ia analiser e resumir oq cada commit fez -> se nao tem novo commit nao analisa
- [ ] botao de IA para a gente preencher os dados do markdown com ia 

## NAME 

wharehouse
repo center
project center
project lab
project hub

