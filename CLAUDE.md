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

<project_tools>
  <tool id="linear">
    <name>linear</name>
    <description>CLI to interact with linear from the terminal</description>
    <cmd>linear</cmd>
    <example>
      ## check all the commands
      linear --help
      
      ## se issue details
      linear issue show https://linear.app/team/issue/ISSUE-123
      
      ## create an issue
      linear issue create --title "New feature" --description "Description" --assignee user@example.com --label bug --priority 2 
    </example>
    <when>
      checking for issue details
      checking for project details
      checking for document details
      create structure projects
    </when>
  </tool>

  <tool id="github-cli">
    <name>github-cli</name>
    <description>CLI to interact with GitHub from the terminal</description>
    <cmd>gh</cmd>
    <example>
      ## check all the commands
      gh --help
      
      ## view PR details
      gh pr view 123 --json number,title,url,state
      
      ## check GitHub Actions status
      gh run list
      
      ## create a PR
      gh pr create --title "New feature" --body "Description" --base main --head feature-branch
      
      ## view issue details
      gh issue view 456
    </example>
    <when>
      checking PR details
      checking GitHub Actions status
      viewing issue details
      creating and managing PRs
      viewing repository information
    </when>
  </tool>

  <tool id="chrome-cmd">
    <name>chrome-cmd</name>
    <description>Interact with the same chrome browser used by the user</description>
    <cmd>chrome-cmd</cmd>
    <example>
      ## Example command
      chrome-cmd
    </example>
    <when>
      Use case 1
      Use case 2
    </when>
    <rules>
      Rule 1
      Rule 2
    </rules>
    <notes>
      Note 1
      Note 2
    </notes>
    <troubleshooting>
      Issue 1: Solution 1
      Issue 2: Solution 2
    </troubleshooting>
  </tool>

</project_tools>
