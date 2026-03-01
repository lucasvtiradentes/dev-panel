<a name="TOC"></a>

<div align="center">
  <img height="80" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/resources/icon-colored.png" alt="dev-panel logo">
  <div><strong>Dev Panel</strong></div>
  <br />
  <a href="#-overview">Overview</a> • <a href="#-features">Features</a> • <a href="#-quick-start">Quick Start</a> • <a href="#-usage">Usage</a> • <a href="#-contributing">Contributing</a> • <a href="#-license">License</a>
</div>

<div width="100%" align="center">
  <img src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/divider.png" />
</div>

## 🎺 Overview<a href="#TOC"><img align="right" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/up_arrow.png" width="22"></a>

All-in-one command center for development productivity. A VSCode extension that integrates task management, variables, replacements, and git excludes into a unified sidebar.

<div align="center">
  <a href="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/demo.png" target="_blank">
    <img height="400" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/demo.png" alt="Dev Panel sidebar">
  </a>
  <br>
  <em>manage tasks, variables, replacements, and excludes in the sidebar</em>
</div>

## ⭐ Features<a href="#TOC"><img align="right" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/up_arrow.png" width="22"></a>

- **Multi-Source Task Runner** - Execute npm scripts, VSCode tasks, and custom DevPanel tasks with optional inputs
- **Dynamic Variables** - Configure project options with choose, input, toggle, file, and folder types
- **File Replacements** - Replace entire files or apply search/replace patches with git integration
- **Git Excludes** - Manage `.git/info/exclude` patterns directly from the sidebar
- **Keybinding Support** - Bind keyboard shortcuts to tasks, variables, and replacements

## 🚀 Quick Start<a href="#TOC"><img align="right" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/up_arrow.png" width="22"></a>

### Installation

Install from VSCode Marketplace or build from source:

```bash
git clone https://github.com/lucasvtiradentes/dev-panel.git
cd dev-panel
npm install && npm run build
```

Then press `F5` to launch Extension Development Host or install the built `.vsix` file.

## 📖 Usage<a href="#TOC"><img align="right" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/up_arrow.png" width="22"></a>

<div align="center">

<details>
<summary><strong>Tasks View</strong></summary>
<br />

<div align="left">

Multi-source task runner in the Explorer sidebar.

**Task Sources:**
- DevPanel Tasks (custom commands)
- npm Scripts (from package.json)
- VSCode Tasks (from .vscode/tasks.json)

**Features:**
- Switch between sources
- Organize by groups
- Set keybindings
- Navigate to task definition
- Collect inputs before execution
- Run silently with `hideTerminal`

**Example:**

```jsonc
{
  "tasks": [
    {
      "name": "deploy",
      "command": "npm run build && ./deploy.sh $ENV",
      "group": "CI",
      "inputs": [
        { "name": "ENV", "type": "choice", "options": ["staging", "prod"] }
      ]
    },
    {
      "name": "quick-test",
      "command": "npm test",
      "hideTerminal": true
    }
  ]
}
```

</div>

</details>

<details>
<summary><strong>Variables View</strong></summary>
<br />

<div align="left">

Manage dynamic configuration options for your project.

**Variable Types:**
- **choose** - Single or multi-select from predefined options
- **input** - Text input field
- **toggle** - ON/OFF switch
- **file** - Single or multiple file selection
- **folder** - Single or multiple folder selection

**Features:**
- Group variables by category
- Set keybindings for quick access
- Run shell commands on value change
- Values shown in status bar

**Example:**

```jsonc
{
  "variables": [
    {
      "name": "environment",
      "kind": "choose",
      "options": ["local", "staging", "prod"],
      "command": "echo Selected: $VALUE",
      "group": "Config"
    },
    {
      "name": "debug",
      "kind": "toggle",
      "default": false
    }
  ]
}
```

</div>

</details>

<details>
<summary><strong>Replacements View</strong></summary>
<br />

<div align="left">

Apply file replacements with git skip-worktree integration. Changes are hidden from git status.

**Replacement Types:**
- **file** - Replace entire file with another
- **patch** - Apply search/replace patches to a file

**Features:**
- Toggle individual or all replacements
- Preview diff before applying
- Auto-restore on deactivation
- Group by category

**Example:**

```jsonc
{
  "replacements": [
    {
      "name": "use-local-api",
      "type": "file",
      "source": ".devpanel/replacements/api-local.ts",
      "target": "src/config/api.ts",
      "group": "Config"
    },
    {
      "name": "enable-debug",
      "type": "patch",
      "target": "src/index.ts",
      "patches": [
        { "search": "DEBUG = false", "replace": "DEBUG = true" },
        { "search": "logger.level = 'error'", "replace": "logger.level = 'debug'" }
      ]
    }
  ]
}
```

</div>

</details>

<details>
<summary><strong>Excludes View</strong></summary>
<br />

<div align="left">

Manage `.git/info/exclude` patterns directly from the sidebar. Local gitignore rules that aren't committed.

**Features:**
- Add/remove exclude patterns
- Auto-refresh on file changes
- Open exclude file directly

</div>

</details>

<details>
<summary><strong>Configuration</strong></summary>
<br />

<div align="left">

Configure Dev Panel in your workspace:

```
workspace-root/
  .devpanel/
    config.jsonc              # Main configuration
    variables.json            # Variable values (auto-generated)
    replacements/             # Source files for replacements
```

The extension provides JSON schema validation for `config.jsonc`.

**Full Example:**

```jsonc
{
  "$schema": "./node_modules/dev-panel/resources/schema.json",
  "settings": {
    "exclude": ["**/node_modules/**", "**/dist/**"]
  },
  "variables": [
    { "name": "env", "kind": "choose", "options": ["dev", "prod"] }
  ],
  "replacements": [
    { "name": "mock-api", "type": "file", "source": ".devpanel/mock.ts", "target": "src/api.ts" }
  ],
  "tasks": [
    { "name": "build", "command": "npm run build" }
  ]
}
```

</div>

</details>

</div>

## 🤝 Contributing<a href="#TOC"><img align="right" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/up_arrow.png" width="22"></a>

Contributions are welcome! Feel free to open issues or submit pull requests.

```bash
npm run build      # Build the extension
npm run lint       # Check code style
npm run format     # Format code
npm run typecheck  # Type checking
```

## 📜 License<a href="#TOC"><img align="right" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/up_arrow.png" width="22"></a>

MIT License - see [LICENSE](LICENSE) file for details.

<div width="100%" align="center">
  <img src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/divider.png" />
</div>

<br />

<div align="center">
  <div>
    <a target="_blank" href="https://www.linkedin.com/in/lucasvtiradentes/"><img src="https://img.shields.io/badge/-linkedin-blue?logo=Linkedin&logoColor=white" alt="LinkedIn"></a>
    <a target="_blank" href="mailto:lucasvtiradentes@gmail.com"><img src="https://img.shields.io/badge/gmail-red?logo=gmail&logoColor=white" alt="Gmail"></a>
    <a target="_blank" href="https://x.com/lucasvtiradente"><img src="https://img.shields.io/badge/-X-black?logo=X&logoColor=white" alt="X"></a>
    <a target="_blank" href="https://github.com/lucasvtiradentes"><img src="https://img.shields.io/badge/-github-gray?logo=Github&logoColor=white" alt="Github"></a>
  </div>
</div>
