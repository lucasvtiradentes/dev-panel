# Description

A VSCode extension for managing project-specific tasks, variables, and configurations from the Explorer pane. Provides a centralized panel for developer productivity with support for both workspace and global configurations.

# Motivation

Developers often create helper scripts (db dumps, deployment shortcuts, code generators) that boost productivity but remain siloed in personal setups. **Dev Panel** solves this by:

- Making tasks/configs **shareable** via `.devpanel/` directory in the repo
- Providing a **visual interface** instead of remembering CLI commands
- Supporting **global configs** (`~/.devpanel/`) for cross-project tasks

# Features

- **Visual by default**: Control everything about your project with multiple views
- **Init withing seconds**: Quick run the "init" command to start with a minimal working config
- **Customizable**: Extend functionality with custom providers

# Extension parts

## Entry points

## Views

- **Variables**: Configurable project options (toggle, choose, input, file/folder picker)
- **Replacements**: File/patch swaps with one-click activation
- **Tasks**: Run npm scripts, VSCode tasks, or custom DevPanel tasks

## Status bar

Config location picker - allows changing where `.devpanel/` directory is located within the workspace.

## Commands

| Category | Commands |
|----------|----------|
| **View toggles** | Group mode, show hidden, show only favorites |
| **Item actions** | Execute, favorite, hide, delete, copy to global/workspace |
| **Keybindings** | Set/sync keybindings for variables, tasks |
| **Navigation** | Go to file, open config |

## Watchers

| Watcher | Trigger | Action |
|---------|---------|--------|
| **Config** | `.devpanel/config.jsonc` change | Reload all views |

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
│           Load .devpanel/config.jsonc + ~/.devpanel/   │
│              Parse with JSON5 + Zod                     │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌──────────┬──────────┬──────────┐
│Variables │Replacemts│  Tasks   │
└────┬─────┴────┬─────┴────┬─────┘
     │          │          │
     ▼          ▼          ▼
┌─────────────────────────────────────────────────────────┐
│              Register Tree Data Providers               │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│               Setup File Watchers                       │
│                    (config)                             │
└─────────────────────────────────────────────────────────┘
```
