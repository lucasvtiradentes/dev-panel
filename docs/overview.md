---
title:       Overview
description: Dev Panel - VSCode extension for AI-assisted development productivity
related_docs:
  - docs/architecture.md:         technical implementation details
  - docs/features/task-runner.md: task execution capabilities
sources:
  - package.json:     extension metadata and dependencies
  - src/extension.ts: entry point and activation
---

# Overview

Dev Panel is a VSCode extension that provides an all-in-one command center for AI-assisted development. It consolidates task management, dynamic variables, file replacements, and git excludes into a unified sidebar interface.

## Purpose

- Centralize development workflows in a single panel
- Enable dynamic configuration through variables
- Manage local file modifications without polluting git history
- Provide multi-source task execution (npm, VSCode, custom)

## Technologies

| Technology | Version | Purpose                      |
|------------|---------|------------------------------|
| TypeScript | 5.7+    | Primary language             |
| VSCode API | 1.93+   | Extension platform           |
| esbuild    | 0.24    | Bundling                     |
| Zod        | 4.2     | Schema validation            |
| JSON5      | 2.2     | Config parsing with comments |
| pnpm       | 9.15    | Package manager              |

## Runtime Dependencies

The extension has only 2 runtime dependencies:

- json5 - Parse JSONC config files
- zod   - Validate configuration schema

## Entry Point

```
src/extension.ts
    │
    └── activate()
         ├── setupStatesAndContext()
         ├── setupInitialKeybindings()
         ├── setupProviders()
         ├── setupTreeViews()
         ├── setupDisposables()
         ├── setupConfigChangeListener()
         ├── setupWatchers()
         └── setupCommands()
```

## Key Features

- Multi-source task runner (npm scripts, VSCode tasks, DevPanel tasks)
- Dynamic variables with shell command execution on change
- File replacements using git skip-worktree
- Local .git/info/exclude management from sidebar
- Status bar with variable state tooltip
- Keyboard shortcut bindings for tasks and variables

## Configuration

The extension reads configuration from `.devpanel/config.jsonc`:

```
.devpanel/
├── config.jsonc      # Main configuration
├── variables.json    # Auto-generated variable state
└── replacements/     # Replacement source files
```

## Version

Current version: 0.4.1
