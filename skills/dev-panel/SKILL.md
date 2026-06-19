---
name: dev-panel
description: Manage DevPanel VSCode extension config - add tasks, variables, replacements, git excludes. Use when user asks to configure DevPanel or add items to .devpanel/config.jsonc.
---

# DevPanel Configuration

DevPanel config lives at `.devpanel/config.jsonc` (JSONC). It can define:
- Tasks        - shell commands with optional inputs
- Variables    - persisted values in `.devpanel/variables.json`
- Replacements - temporary file or patch changes hidden with `skip-worktree`
- Git Excludes - local `.git/info/exclude` patterns

## Prerequisites

1. Run `ls -la .devpanel/config.jsonc`.
2. If `.devpanel/` is missing: stop and say `Run DevPanel: Initialize from VSCode command palette first.`
3. If `git rev-parse --git-dir` fails: warn that replacements require git.

## Workflow

1. Read `.devpanel/config.jsonc` before editing.
2. Preserve JSONC comments and formatting where possible.
3. Validate names are unique inside each category.

## Top-level config

| Property            | Type   | Description                                                            |
|---------------------|--------|------------------------------------------------------------------------|
| `$schema`           | string | Schema URL                                                             |
| tasks               | array  | DevPanel task definitions                                              |
| variables           | array  | Variable definitions                                                   |
| replacements        | array  | Replacement definitions                                                |
| taskScanIgnorePaths | array  | Directory names ignored while scanning package.json and Makefile tasks |

## Tasks

| Property     | Type    | Req | Description                                          |
|--------------|---------|-----|------------------------------------------------------|
| name         | string  | yes | Unique task id                                       |
| command      | string  | yes | Shell command; use `$inputName` for collected inputs |
| group        | string  | no  | Group in tree view                                   |
| description  | string  | no  | Tooltip                                              |
| hideTerminal | boolean | no  | Run silently with progress notification              |
| useConfigDir | boolean | no  | Run from `.devpanel/` instead of workspace root      |
| inputs       | array   | no  | Inputs collected before execution                    |

Task commands receive `.devpanel/variables.json` values as environment variables. Object values become JSON strings; primitives become strings.

### Task inputs

Each input requires: `name`, `type`, `label`.

| type        | Extra props                     | Result value                    |
|-------------|---------------------------------|---------------------------------|
| text        | placeholder                     | text string                     |
| number      | placeholder                     | numeric string after validation |
| confirm     | -                               | `true` or `false` string        |
| file/folder | multiSelect, includes, excludes | selected path(s)                |
| choice      | options                         | selected option                 |
| multichoice | options                         | selections joined by newline    |

For file/folder task inputs, `useConfigDir: true` makes selection relative to `.devpanel/`; otherwise workspace root is used.

## Variables

| Property    | Type    | Req  | Description                                    |
|-------------|---------|------|------------------------------------------------|
| name        | string  | yes  | Unique variable id                             |
| kind        | string  | yes  | `choose`, `input`, `toggle`, `file`, `folder`  |
| default     | varies  | no   | string, boolean, or string[] for multi-select  |
| description | string  | no   | Tooltip / prompt label                         |
| group       | string  | no   | Group in tree view                             |
| command     | string  | no   | Shell command run when value changes           |
| options     | array   | cond | Required for `choose`                          |
| multiSelect | boolean | no   | Multi-selection for `choose`, `file`, `folder` |
| includes    | array   | no   | Glob patterns for `file`/`folder` selection    |
| excludes    | array   | no   | Glob patterns for `file`/`folder` selection    |

Variable state is stored in `.devpanel/variables.json`. `command` runs from `.devpanel/`, replaces `${workspaceFolder}`, and appends the selected value as a quoted argument. Array values are joined with commas.

## Replacements

Hidden from git via `skip-worktree`. Requires git repo.

| Property    | Type   | Req  | Description                                           |
|-------------|--------|------|-------------------------------------------------------|
| name        | string | yes  | Unique replacement id                                 |
| type        | string | yes  | `file` or `patch`                                     |
| target      | string | yes  | Workspace-relative or absolute target path            |
| source      | string | cond | Workspace-relative or absolute source path for `file` |
| patches     | array  | cond | `{ search, replace }` items for `patch`               |
| group       | string | no   | Group in tree view                                    |
| description | string | no   | Tooltip                                               |

Rules:
- `type: file`: `source` must exist; target parent folder is created if needed.
- `type: patch`: `target` must exist; unmatched patches show a warning.
- `search` and `replace` may be strings or arrays of strings.
- Deactivation restores git-tracked targets with `git checkout`; untracked targets are deleted.

## Git Excludes

Managed in `.git/info/exclude` (local-only gitignore). File is auto-created if missing.

```bash
echo "pattern" >> .git/info/exclude
```

## Example

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/lucasvtiradentes/dev-panel/main/resources/schema.json",
  "taskScanIgnorePaths": ["node_modules", "dist"],
  "tasks": [
    {
      "name": "deploy",
      "command": "deploy.sh $env",
      "group": "Dev",
      "inputs": [{ "name": "env", "type": "choice", "label": "Environment", "options": ["staging", "prod"] }]
    }
  ],
  "variables": [
    { "name": "environment", "kind": "choose", "options": ["dev", "staging", "prod"], "default": "dev" },
    { "name": "debugMode", "kind": "toggle", "default": false }
  ],
  "replacements": [
    { "name": "local-env", "type": "file", "source": ".devpanel/local.env", "target": ".env" },
    {
      "name": "enable-debug",
      "type": "patch",
      "target": "src/config.ts",
      "patches": [{ "search": "DEBUG = false", "replace": "DEBUG = true" }]
    }
  ]
}
```

## Validation rules

- All `name` fields must be unique within their category.
- Tasks require `command`.
- `choose` variables require non-empty `options`.
- `file` replacements require existing `source`.
- `patch` replacements require existing `target` and non-empty `patches`.
