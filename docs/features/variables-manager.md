---
title:       Variables Manager
description: Dynamic configuration variables with persistence and shell commands
required_docs:
  - docs/architecture.md:          state management details
related_docs:
  - docs/features/task-runner.md:  variable usage in tasks
sources:
  - src/views/variables/variables-provider.ts: VariablesProvider
  - src/views/variables/state.ts:              state persistence
  - src/common/schemas/config-schema.ts:       variable schema
---

# Variables Manager

Variables provide dynamic configuration values that persist across sessions and can trigger shell commands on change.

## Variable Types

| Kind   | Description         | UI Element           |
|--------|---------------------|----------------------|
| choose | Select from options | Quick pick dropdown  |
| input  | Free text entry     | Input box            |
| toggle | Boolean ON/OFF      | Toggle (click)       |
| file   | File selection      | Quick pick list      |
| folder | Folder selection    | Quick pick list      |

## Configuration

```jsonc
{
  "variables": [
    {
      "name": "environment",
      "kind": "choose",
      "options": ["development", "staging", "production"],
      "default": "development",
      "description": "Current environment",
      "group": "Config",
      "command": "echo Selected:"
    }
  ]
}
```

### Variable Properties

| Property    | Type     | Description                                     |
|-------------|----------|-------------------------------------------------|
| name        | string   | Unique identifier                               |
| kind        | string   | Variable type (choose/input/toggle/file/folder) |
| default     | varies   | Default value                                   |
| description | string?  | Tooltip text                                    |
| group       | string?  | Group for organizing in tree view               |
| command     | string?  | Shell command to run on value change            |
| options     | array?   | Options for choose kind                         |
| multiSelect | boolean? | Enable multi-selection (choose/file/folder)     |
| includes    | array?   | Glob patterns to include (file/folder)          |
| excludes    | array?   | Glob patterns to exclude (file/folder)          |

## Variable Kinds

### Choose (Single)

```jsonc
{
  "name": "theme",
  "kind": "choose",
  "options": ["light", "dark", "auto"],
  "default": "auto"
}
```

### Choose (Multi-select)

```jsonc
{
  "name": "features",
  "kind": "choose",
  "options": ["auth", "api", "ui", "tests"],
  "multiSelect": true,
  "default": ["auth", "api"]
}
```

### Input

```jsonc
{
  "name": "apiUrl",
  "kind": "input",
  "default": "http://localhost:3000"
}
```

### Toggle

```jsonc
{
  "name": "debugMode",
  "kind": "toggle",
  "default": false
}
```

### File Selection

```jsonc
{
  "name": "configFile",
  "kind": "file",
  "includes": ["**/*.json", "**/*.yaml"],
  "excludes": ["**/node_modules/**"]
}
```

### Folder Selection

```jsonc
{
  "name": "outputDir",
  "kind": "folder",
  "multiSelect": false
}
```

## Shell Command Execution

When a variable has a `command` property, it executes after value change:

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ User selects │───→│ Update state     │───→│ Execute command │
│ new value    │    │ refresh view     │    │ with $VALUE     │
└──────────────┘    └──────────────────┘    └─────────────────┘
```

The command runs from the `.devpanel/` directory with:
- The selected value appended as a quoted argument
- `${workspaceFolder}` substitution for workspace path
- Progress notification during execution
- Error notification on failure

Example:
```jsonc
{
  "name": "branch",
  "kind": "choose",
  "options": ["main", "develop", "feature"],
  "command": "git checkout"
}
```

## State Persistence

Variables state is stored in `.devpanel/variables.json`:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Variables State                              │
│                                                                 │
│  {                                                              │
│    "environment": "production",                                 │
│    "features": ["auth", "api"],                                 │
│    "debugMode": true                                            │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              v
┌─────────────────────────────────────────────────────────────────┐
│              .devpanel/variables.json                           │
│         Persists across sessions per workspace                  │
└─────────────────────────────────────────────────────────────────┘
```

## UI Features

### Tree View

```
Variables
├── Config (group)
│   ├── environment: production
│   └── debugMode: ON
└── Paths (group)
    └── outputDir: ./dist
```

### Display Format

| Kind   | Display              |
|--------|----------------------|
| choose | Selected option      |
| input  | Current value        |
| toggle | "ON" or "OFF"        |
| file   | Filename or count    |
| folder | Folder name or count |

### Keybindings

Variables can have keyboard shortcuts:
1. Right-click variable -> "Set Keybinding"
2. Enter key combination
3. Press shortcut to trigger selection

### Reset

Right-click -> "Reset" removes the stored value, reverting to default.

## File/Folder Defaults

When a file/folder variable does not specify `includes` or `excludes`, the defaults are `["**/*"]` for includes and `[]` for excludes (i.e., all files are shown).
