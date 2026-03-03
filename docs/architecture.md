---
title:       Architecture
description: Technical architecture and data flow of the Dev Panel extension
required_docs:
  - docs/overview.md:                    high-level project understanding
related_docs:
  - docs/features/task-runner.md:       task execution details
  - docs/features/variables-manager.md: variable system details
sources:
  - src/extension.ts:             activation and setup
  - src/views/:                   tree data providers
  - src/watchers/:                file system watchers
  - src/commands/register-all.ts: command registration
  - src/status-bar/:              status bar management
  - src/common/core/:             core utilities
---

# Architecture

## Activation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     VSCode Startup                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              v
┌─────────────────────────────────────────────────────────────┐
│                 onStartupFinished event                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              v
┌─────────────────────────────────────────────────────────────┐
│                    activate(context)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ 1. setupStatesAndContext()                             │ │
│  │    ├── initWorkspaceState(context)                     │ │
│  │    ├── extensionStore.initialize(context)              │ │
│  │    └── setWorkspaceId()                                │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ 2. setupInitialKeybindings()                           │ │
│  │    ├── reloadTaskKeybindings()                         │ │
│  │    └── reloadVariableKeybindings()                     │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ 3. setupProviders(workspace)                           │ │
│  │    ├── StatusBarManager                                │ │
│  │    ├── TaskTreeDataProvider                            │ │
│  │    ├── VariablesProvider                               │ │
│  │    ├── ReplacementsProvider                            │ │
│  │    └── ExcludesProvider                                │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ 4. setupTreeViews(providers)                           │ │
│  │    ├── Tasks Explorer/Panel view                       │ │
│  │    ├── Variables view                                  │ │
│  │    ├── Replacements view                               │ │
│  │    └── Excludes view                                   │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ 5. setupWatchers(context, providers, workspace)        │ │
│  │    ├── ConfigWatcher                                   │ │
│  │    ├── KeybindingsWatcher                              │ │
│  │    └── ExcludesWatcher                                 │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ 6. setupCommands(context, providers)                   │ │
│  │    └── registerAllCommands() → 30+ commands            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## View Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Activity Bar                             │
│                      ┌──────────────┐                            │
│                      │  Dev Panel   │                            │
│                      │     Icon     │                            │
│                      └──────────────┘                            │
└──────────────────────────────────────────────────────────────────┘
                              │
                              v
┌──────────────────────────────────────────────────────────────────┐
│                       Dev Panel Sidebar                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Variables (devPanelConfigs)                                │  │
│  │   └── VariablesProvider → VariableTreeItem                 │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ Replacements (devPanelReplacements)                        │  │
│  │   └── ReplacementsProvider → ReplacementTreeItem           │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ Excludes (devPanelExcludes)                                │  │
│  │   └── ExcludesProvider → ExcludeTreeItem                   │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ Task Runner (devPanelTasksPanel | devPanelTasksExplorer)   │  │
│  │   └── TaskTreeDataProvider → TreeTask                      │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  config.jsonc   │───→│  ConfigManager  │───→│   Zod Schema    │
│   (on disk)     │    │   parseConfig   │    │   validation    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                              ┌───────────────────────┘
                              v
┌─────────────────────────────────────────────────────────────────┐
│                    TreeDataProvider                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ getChildren() → reads config, builds TreeItem array        │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ refresh() → fires onDidChangeTreeData event                │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              v
┌─────────────────────────────────────────────────────────────────┐
│                    VSCode Tree View                             │
│                  (renders TreeItems)                            │
└─────────────────────────────────────────────────────────────────┘
```

## State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                    Workspace State                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ tasksState                                                 │ │
│  │   ├── source (vscode | package | devpanel)                 │ │
│  │   ├── grouped (boolean)                                    │ │
│  │   ├── showHidden (per source)                              │ │
│  │   ├── hidden (per source)                                  │ │
│  │   ├── favorites (per source)                               │ │
│  │   └── order (item ordering)                                │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ variablesState                                             │ │
│  │   └── { variableName: currentValue }                       │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │ replacementsState                                          │ │
│  │   ├── activeReplacements (string[])                        │ │
│  │   ├── lastBranch (string)                                  │ │
│  │   └── grouped (boolean)                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              v
┌─────────────────────────────────────────────────────────────────┐
│              VSCode Workspace State API                         │
│         context.workspaceState.get/update()                     │
└─────────────────────────────────────────────────────────────────┘
```

## Task Execution Flow

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  User Click  │───→│ executeTask cmd  │───→│ Collect Inputs      │
│  on Task     │    │                  │    │ (if task.inputs)    │
└──────────────┘    └──────────────────┘    └─────────────────────┘
                                                      │
                              ┌───────────────────────┘
                              v
┌─────────────────────────────────────────────────────────────────┐
│                    Environment Setup                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Get workspace path                                      │ │
│  │ 2. Load variable values                                    │ │
│  │ 3. Build env object with $VAR_NAME substitution            │ │
│  │ 4. Set cwd (workspace or config dir)                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         v                                         v
┌─────────────────────┐               ┌─────────────────────┐
│ hideTerminal: true  │               │ hideTerminal: false │
│                     │               │                     │
│ executeTaskSilently │               │ VSCode Task API     │
│ - spawn process     │               │ - ShellExecution    │
│ - show progress     │               │ - Terminal output   │
│ - notify on done    │               │                     │
└─────────────────────┘               └─────────────────────┘
```

## Watcher System

```
┌─────────────────────────────────────────────────────────────────┐
│                      File Watchers                              │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │   ConfigWatcher                                            │ │
│  │   Pattern: **/.devpanel/config.jsonc                       │ │
│  │   Actions: refresh all providers, reload variables         │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │   KeybindingsWatcher                                       │ │
│  │   Pattern: .vscode/keybindings.json (workspace)            │ │
│  │   Actions: reload task/variable keybindings                │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │   ExcludesWatcher                                          │ │
│  │   Pattern: .git/info/exclude                               │ │
│  │   Actions: refresh excludes provider                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Command Registration

Commands are registered in `src/commands/register-all.ts`:

| Command Category | Count | Examples                                   |
|------------------|-------|--------------------------------------------|
| Tasks            | 12    | executeTask, switchTaskSource, toggleHide  |
| Variables        | 6     | selectConfigOption, setVariableKeybinding  |
| Replacements     | 7     | toggleReplacement, previewReplacementDiff  |
| Excludes         | 3     | addExclude, removeExclude, openExcludeFile |
| Debug            | 3     | showLogs, showWorkspaceState, clearState   |

## Logging

Logger writes to `/tmp/dev-panel-dev.log` with format:

```
[2026-03-01T10:30:45.123-03:00] [devpanel] [INFO ] message here
```

Components:
- Timestamp with timezone offset
- Context (8 char, padded)
- Level (INFO/ERROR/WARN/DEBUG)
- Message

## Status Bar

```
┌─────────────────────────────────────────────────────────────────┐
│ Status Bar (left, priority 100)                                 │
│                                                                 │
│  Icon: $(flame) when config exists                              │
│        $(warning) when no config                                │
│                                                                 │
│  Tooltip: Lists all variable current values                     │
│                                                                 │
│  Click: Opens settings menu                                     │
└─────────────────────────────────────────────────────────────────┘
```
