---
title:       Task Runner
description: Multi-source task execution with inputs and keybindings
required_docs:
  - docs/architecture.md:               overall system design
related_docs:
  - docs/features/variables-manager.md: variable substitution in tasks
sources:
  - src/views/tasks/provider.ts:           TaskTreeDataProvider
  - src/views/tasks/task-executor.ts:      task execution
  - src/views/tasks/devpanel-tasks.ts:     DevPanel task source
  - src/views/tasks/vscode-tasks.ts:       VSCode task source
  - src/views/tasks/package-json.ts:       npm scripts source
  - src/views/tasks/makefile-tasks.ts:     Makefile task source
  - src/commands/internal/execute-task.ts: input collection
---

# Task Runner

The Task Runner provides a unified interface for executing tasks from multiple sources.

## Task Sources

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                              Task Runner View                                     │
│                                                                                   │
│  Source Toggle: [VSCode] ←→ [npm] ←→ [DevPanel] ←→ [Makefile]                     │
│                                                                                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐ │
│  │ VSCode Tasks    │ │ npm Scripts     │ │ DevPanel Tasks  │ │ Makefile Targets │ │
│  │ .vscode/        │ │ package.json    │ │ config.jsonc    │ │ Makefile         │ │
│  │ tasks.json      │ │ scripts: {}     │ │ tasks: []       │ │ targets          │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └──────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────┘
```

| Source   | Config Location          | Features                 |
|----------|--------------------------|--------------------------|
| VSCode   | `.vscode/tasks.json`     | Native VSCode tasks      |
| npm      | `package.json` scripts   | npm/yarn/pnpm scripts    |
| DevPanel | `.devpanel/config.jsonc` | Custom tasks with inputs |
| Makefile | `Makefile`               | Make targets             |

## Source Availability

Sources are dynamic — VSCode, npm, and Makefile only appear if their files exist in the workspace. DevPanel is always available as fallback.

- Switch button only shows when multiple sources are available
- If the current source file is deleted, view falls back to DevPanel
- File watcher auto-refreshes the view when source files change (tasks.json, package.json, Makefile)

## DevPanel Task Definition

```jsonc
{
  "tasks": [
    {
      "name": "build",
      "command": "npm run build",
      "group": "Development",
      "description": "Build the project",
      "hideTerminal": false,
      "useConfigDir": false,
      "inputs": [
        {
          "name": "mode",
          "type": "choice",
          "label": "Build mode",
          "options": ["development", "production"]
        }
      ]
    }
  ]
}
```

### Task Properties

| Property     | Type     | Description                              |
|--------------|----------|------------------------------------------|
| name         | string   | Unique task identifier                   |
| command      | string   | Shell command to execute                 |
| group        | string?  | Group for organizing in tree view        |
| description  | string?  | Tooltip text                             |
| hideTerminal | boolean? | Run silently with progress notification  |
| useConfigDir | boolean? | Run from .devpanel/ instead of workspace |
| inputs       | array?   | Inputs to collect before execution       |

## Input Types

| Type        | Description               | Properties                      |
|-------------|---------------------------|---------------------------------|
| text        | Free text input           | placeholder                     |
| number      | Numeric input             | placeholder                     |
| confirm     | Yes/No boolean            | -                               |
| file        | File picker               | multiSelect, includes, excludes |
| folder      | Folder picker             | multiSelect, includes, excludes |
| choice      | Single selection dropdown | options                         |
| multichoice | Multi-selection dropdown  | options                         |

### Input Example

```jsonc
{
  "inputs": [
    {
      "name": "file",
      "type": "file",
      "label": "Select file to process",
      "includes": ["**/*.ts"],
      "excludes": ["**/node_modules/**"]
    },
    {
      "name": "verbose",
      "type": "confirm",
      "label": "Enable verbose output?"
    }
  ]
}
```

Variables are substituted in the command as `$name`:
```jsonc
{
  "command": "process $file --verbose=$verbose"
}
```

## Execution Flow

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Click Task  │───→│ Has inputs?      │───→│ Collect inputs  │
└──────────────┘    └──────────────────┘    └─────────────────┘
                           │ no                     │
                           v                        v
                    ┌──────────────────┐    ┌─────────────────┐
                    │ Build env object │←───│ Substitute vars │
                    │ (process.env +   │    │ in command      │
                    │ variables)       │
                    └──────────────────┘    └─────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         v                                   v
┌─────────────────────┐             ┌─────────────────────┐
│ hideTerminal: true  │             │ hideTerminal: false │
│                     │             │                     │
│ executeTaskSilently │             │ VSCode Task API     │
│ ├── child_process   │             │ ├── ShellExecution  │
│ ├── progress bar    │             │ └── Terminal output │
│ └── notification    │             │                     │
└─────────────────────┘             └─────────────────────┘
```

## Silent Execution

When `hideTerminal: true`:
- No terminal panel opened
- Progress notification shown
- Success/failure notification on completion
- Output captured for logging

## Keyboard Shortcuts

DevPanel tasks can have keybindings via the setTaskKeybinding command:

1. Right-click task -> "Set Keybinding"
2. Enter key combination (e.g., "ctrl+shift+b")
3. Keybinding stored in workspace keybindings.json

View/edit keybindings:
- Click keyboard icon in Task Runner title bar
- Opens keybindings.json filtered to devpanel tasks

## View Features

### Grouping

Tasks can be grouped by the `group` property:
- Toggle grouped/flat view with title bar button
- Groups collapse/expand

### Favorites

- Right-click -> "Add to Favorites"
- Filter to show only favorites
- Favorites persist per source

### Hidden

- Right-click -> "Hide Task"
- Toggle hidden visibility in title bar
- Hidden state persists per source

### Drag and Drop

Tasks can be reordered via drag and drop:
- Reorder within groups or flat list
- Order persists in workspace state

## Environment Variables

Tasks inherit the full process environment (`process.env`), merged with all DevPanel variables:

```
process.env (PATH, HOME, etc.)
    + DevPanel variable "projectName" = "my-app"
    ↓
Available as $projectName in command (DevPanel variables override process.env)
```

Combined with input variables for task execution.
