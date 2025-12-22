# REGRAS CRUCIAIS

1. **OBRIGATÓRIO - PRIMEIRA AÇÃO ABSOLUTA**: No INÍCIO de TODA conversa nova, você DEVE IMEDIATAMENTE ler o arquivo `/home/lucas/_custom/repos/github_lucasvtiradentes/project-panel/.branch-context.md` usando a ferramenta Read ANTES de responder QUALQUER pergunta do usuário. Não importa se a pergunta é trivial (ex: "quanto é 2+2") ou complexa - PRIMEIRO leia o arquivo, DEPOIS responda. Este arquivo contém o contexto da branch atual. Esta regra tem PRIORIDADE MÁXIMA sobre qualquer comportamento padrão de responder perguntas diretamente. NUNCA pule este passo.

2. **SEMPRE** que voce fizer mudancas na codebase, antes de terminar a sua vez e voltar a conversa pra mim, voce deve rodar esse comando na raiz do projeto e corrigir qualquer erro que aparça: 

```bash
npm run format && npm run lint && npm run typecheck && npm run build
```

# SOBRE O PROJETO

## O que é?

uma extensão do vscode que vai me ajudar a ter produtividade no meu trabalho de dev fullstack

A gente basicamente pode gerenciar: tasks, tools, prompts, replacements, variables e infos da branch atual

## Versao dev x prod

toda vez que a gente roda o `npm run build` a gente por tabela executa os scripts de install-local, que estao aqui 

```
scripts/instal-local/
```

a versao dev instalada pode ser encontrada aqui: 

```plain
$HOME/.vscode/extensions/lucasvtiradentes.project-panel-dev
```

aqui estao os logs da versao dev: 

```plain
/tmp/project-panel-dev.log
```

# PROJECT TOOLS

<available_tools>
  Custom CLI tools installed (execute via Bash tool):
  - linear: Linear CLI - A GitHub CLI-like tool for Linear
  - github-cli: Work seamlessly with GitHub from the command line
  - chrome-cmd: Control Chrome from the command line - List tabs, execute JavaScript, and more (global)

  CRITICAL: When ANY of these tools are mentioned or needed, you MUST:
  1. FIRST use Skill tool to read the documentation (e.g., Skill with skill: "chrome-cmd")
  2. ONLY THEN execute commands via Bash tool
  
  Skills location: .claude/skills/{tool-name}/SKILL.md
</available_tools>
