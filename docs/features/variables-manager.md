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

## Input Types

| Type    | Description         | UI Element           |
|---------|---------------------|----------------------|
| choice  | Select from options | Quick pick dropdown  |
| text    | Free text entry     | Input box            |
| boolean | Boolean ON/OFF      | Toggle (click)       |
| file   | File selection      | Quick pick list      |
| folder | Folder selection    | Quick pick list      |

## Configuration

```jsonc
{
  "variables": [
    {
      "name": "environment",
      "type": "choice",
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
| type        | string   | Input type (`text`, `number`, `boolean`, `choice`, `file`, `folder`) |
| default     | varies   | Default value                                   |
| description | string?  | Tooltip text                                    |
| group       | string?  | Group for organizing in tree view               |
| command     | string?  | Shell command to run on value change            |
| options     | array?   | Options for `choice`                            |
| multiSelect | boolean? | Enable multi-selection for choice/file/folder   |
| includes    | array?   | Glob patterns to include (file/folder)          |
| excludes    | array?   | Glob patterns to exclude (file/folder)          |

## Variable Input Types

### Choice (Single)

```jsonc
{
  "name": "theme",
  "type": "choice",
  "options": ["light", "dark", "auto"],
  "default": "auto"
}
```

### Choice (Multi-select)

```jsonc
{
  "name": "features",
  "type": "choice",
  "options": ["auth", "api", "ui", "tests"],
  "multiSelect": true,
  "default": ["auth", "api"]
}
```

### Text

```jsonc
{
  "name": "apiUrl",
  "type": "text",
  "default": "http://localhost:3000"
}
```

### Boolean

```jsonc
{
  "name": "debugMode",
  "type": "boolean",
  "default": false
}
```

### File Selection

```jsonc
{
  "name": "configFile",
  "type": "file",
  "includes": ["**/*.json", "**/*.yaml"],
  "excludes": ["**/node_modules/**"]
}
```

### Folder Selection

```jsonc
{
  "name": "outputDir",
  "type": "folder",
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

The command runs from the owning workspace root with:
- The selected value appended as a quoted argument
- `${workspaceFolder}` substitution for workspace path
- Progress notification during execution
- Error notification on failure

Example:
```jsonc
{
  "name": "branch",
  "type": "choice",
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

| Type    | Display              |
|---------|----------------------|
| choice  | Selected option      |
| text    | Current value         |
| boolean | "ON" or "OFF"        |
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
