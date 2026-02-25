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

All-in-one command center for AI-assisted development. A VSCode extension that integrates task management, AI prompt execution, and productivity tools into a unified sidebar.

<div align="center">
  <a href="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/demo.png" target="_blank">
    <img height="400" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/demo.png" alt="Dev Panel sidebar">
  </a>
  <br>
  <em>manage tasks, prompts, and tools in the sidebar</em>
</div>

## ⭐ Features<a href="#TOC"><img align="right" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/up_arrow.png" width="22"></a>

- **Multi-Source Task Runner** - Execute npm scripts, VSCode tasks, and custom DevPanel tasks from one place
- **AI Prompts Management** - Create and run prompts for Claude, Gemini, or Cursor Agent with input collection
- **Dynamic Variables** - Configure project options with choose, input, toggle, file, and folder types
- **Text Replacements** - Pattern-based text substitution with bulk activation control
- **Shell Tools** - Execute shell commands with UI and organize by groups
- **Keybinding Support** - Bind keyboard shortcuts to tasks, prompts, and variables
- **Global & Workspace Scopes** - Share items globally or keep them workspace-specific

## 🚀 Quick Start<a href="#TOC"><img align="right" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/up_arrow.png" width="22"></a>

### Installation

1. Clone the repository:

```bash
git clone https://github.com/lucasvtiradentes/dev-panel.git
cd dev-panel
```

2. Install dependencies and build:

```bash
npm install
npm run build
```

3. Load in VSCode:
   - Open VSCode
   - Press `F5` to launch Extension Development Host
   - Or install the built `.vsix` file


## 📖 Usage<a href="#TOC"><img align="right" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/up_arrow.png" width="22"></a>

<div align="center">

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
- Drag & drop to reorder

</div>

</details>

<details>
<summary><strong>Tools View</strong></summary>
<br />

<div align="left">

Execute shell commands with a visual interface.

**Features:**
- Global and workspace-scoped tools
- Organize by groups
- Favorites and hide functionality
- Generate documentation for all tools
- Copy tools between global and workspace

</div>

</details>

<details>
<summary><strong>Prompts View</strong></summary>
<br />

<div align="left">

Manage and execute AI prompts.

**Supported Providers:**
- Claude
- Gemini
- Cursor Agent

**Features:**
- Collect inputs before execution
- Save output to file
- Organize by groups
- Set keybindings for quick access
- Global and workspace scopes

</div>

</details>

<details>
<summary><strong>Task Runner (Explorer)</strong></summary>
<br />

<div align="left">

Multi-source task runner in the Explorer sidebar.

**Task Sources:**
- DevPanel Tasks
- npm Scripts
- VSCode Tasks

**Features:**
- Switch between sources
- Favorites and hide
- Organize by groups
- Set keybindings
- Navigate to task definition

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
    variables.json            # Variable values
    prompts/                  # Prompt files
```

The extension provides JSON schema validation for `config.jsonc`.

</div>

</details>

</div>

## 🤝 Contributing<a href="#TOC"><img align="right" src="https://cdn.jsdelivr.net/gh/lucasvtiradentes/dev-panel@main/.github/image/up_arrow.png" width="22"></a>

Contributions are welcome! Feel free to open issues or submit pull requests.

```bash
npm run build      # Build the extension
npm run lint       # Check code style
npm run lint:fix   # Fix code style issues
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
