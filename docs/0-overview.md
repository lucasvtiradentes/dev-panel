# Description

A VSCode extension for managing project-specific tools, scripts, prompts, and configurations from the Explorer pane. Provides a centralized panel for developer productivity with support for both workspace and global configurations.

# Motivation

Developers often create helper scripts (db dumps, deployment shortcuts, code generators) that boost productivity but remain siloed in personal setups. **Dev Panel** solves this by:

- Making tools/scripts **shareable** via `.devpanel/` directory in the repo
- Providing a **visual interface** instead of remembering CLI commands
- Supporting **global configs** (`~/.devpanel/`) for cross-project tools

# Features

- **Visual by default**: Control everything about your project with 7 views
- **Init withing seconds**: Quick run the "init" command to start with a minimal working config
- **Customizable**: Extend functionality with custom providers for tasks, code changes sections
- **Comunity driven**: Install community tools/prompts/plugins from central registry

# Extension parts

## Entry points

## Views

- **Variables**: Configurable project options (toggle, choose, input, file/folder picker)
- **Replacements**: File/patch swaps with one-click activation
- **Prompts**: AI prompts with inputs, supports Claude/Gemini/Cursor
- **Tasks**: Run npm scripts, VSCode tasks, or custom DevPanel tasks
- **Tools**: Shell scripts with documentation, toggleable state
- **Branch Context**: Per-branch markdown with objective, notes, PR/Linear links
- **Branch Tasks**: Todo management with milestones, priorities, assignees

## Status bar

Config location picker - allows changing where `.devpanel/` directory is located within the workspace.

## Commands

| Category | Commands |
|----------|----------|
| **View toggles** | Group mode, show hidden, show only favorites |
| **Item actions** | Execute, favorite, hide, delete, copy to global/workspace |
| **Branch context** | Sync, open file, edit fields |
| **Branch tasks** | Add, cycle status, set priority/assignee/due date, filter |
| **Keybindings** | Set/sync keybindings for prompts, variables, tasks |
| **Navigation** | Go to file, open config |

## Watchers

| Watcher | Trigger | Action |
|---------|---------|--------|
| **Branch** | Git HEAD change | Refresh branch context/tasks, sync markdown |
| **Config** | `.devpanel/config.jsonc` change | Reload all views |
| **Markdown** | Branch context file change | Sync to root `.branch-context.md` |
| **Template** | Template file change | Re-sync branch context |

# Diagrams

## Executing in a non-configured workspace

```
┌─────────────────────────────────────────────────────────┐
│                    VSCode Startup                       │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Extension Activates                        │
│            (onStartupFinished)                          │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Check for .devpanel/config.jsonc                    │
│                  NOT FOUND                              │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Show empty views with                      │
│           "No X configured" messages                    │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│     User can still use global configs (~/.devpanel/)          │
│        or run "Init" command to bootstrap               │
└─────────────────────────────────────────────────────────┘
```

## Executing in a configured workspace

```
┌─────────────────────────────────────────────────────────┐
│                    VSCode Startup                       │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Extension Activates                        │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│           Load .devpanel/config.jsonc + ~/.devpanel/                │
│              Parse with JSON5 + Zod                     │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌──────────┬──────────┬──────────┬──────────┬─────────────┐
│Variables │Replacemts│ Prompts  │  Tasks   │   Tools     │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────┬──────┘
     │          │          │          │            │
     ▼          ▼          ▼          ▼            ▼
┌─────────────────────────────────────────────────────────┐
│              Register Tree Data Providers               │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│               Setup File Watchers                       │
│      (config, branch, markdown, template)               │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│            Detect current git branch                    │
│         Load/create branch context file                 │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Sync .branch-context.md                    │
│            (root ↔ .devpanel/branches/X/)                     │
└─────────────────────────────────────────────────────────┘
```
