# REGRA CRUCIAL

**SEMPRE** que voce fizer mudancas na codebase, antes de terminar a sua vez e voltar a conversa pra mim, voce deve rodar esse comando na raiz do projeto e corrigir qualquer erro que aparça: 

```bash
npm run format && npm run lint && npm run typecheck && npm run build
```

# Versao dev x prod

toda vez que a gente roda o `npm run build` a gente por tabela executa os scripts de install-local, que estao aqui 

```
scripts/instal-local/
```

a versao dev instalada pode ser encontrada aqui: 

```plain
$HOME/.vscode/extensions/lucasvtiradentes.better-project-tools-dev
```

aqui estao os logs da versao dev: 

```plain
/tmp/better-project-tools-dev.log
```
