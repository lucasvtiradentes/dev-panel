---
name: dev-panel
description: Manage Dev Panel configuration, tasks, variables, replacements, Git excludes, and VS Code excludes. Use when editing .devpanel/config.jsonc or local exclude state.
---

# Dev Panel Configuration

Dev Panel reads `.devpanel/config.jsonc` from the active workspace root. The schema is strict: do not use removed fields or legacy input names.

## Workflow

1. Read `.devpanel/config.jsonc` before editing.
2. Create the directory/file with `{}` when absent.
3. Preserve JSONC comments and formatting.
4. Keep names unique within each category.
5. Run commands and resolve relative paths from the active workspace root.
6. Validate the final config against `resources/schema.json`.

## Top-Level Config

| Property     | Type   | Description             |
|--------------|--------|-------------------------|
| `$schema`    | string | Schema URL              |
| `tasks`      | array  | Dev Panel tasks         |
| `variables`  | array  | Persistent inputs       |
| `replacements` | array | Reversible file changes |

Task scan ignores are managed through `Dev Panel: Manage Task Scan Ignores`, not `config.jsonc`.

## Shared Input Types

Variables and task inputs use `type`:

| Type      | Extra properties                    | Value              |
|-----------|-------------------------------------|--------------------|
| `text`    | `placeholder`                       | string             |
| `number`  | `placeholder`                       | number             |
| `boolean` | -                                   | boolean            |
| `choice`  | `options`, optional `multiSelect`   | string or string[] |
| `file`    | `multiSelect`, `includes`, `excludes` | path or path[]   |
| `folder`  | `multiSelect`, `includes`, `excludes` | path or path[]   |

Do not use `kind`, `choose`, `input`, `toggle`, `confirm`, or `multichoice`.

## Tasks

Required: `name`, `command`. Optional: `group`, `description`, `hideTerminal`, `inputs`.

```jsonc
{
  "tasks": [
    {
      "name": "deploy",
      "command": "bash .devpanel/tasks/deploy.sh $environment",
      "group": "Deploy",
      "inputs": [
        {
          "name": "environment",
          "type": "choice",
          "label": "Environment",
          "options": ["staging", "production"]
        }
      ]
    }
  ]
}
```

Task input values replace `$inputName`. Dev Panel variables are also available as environment variables. Commands always run from the workspace root; `useConfigDir` does not exist.

## Variables

Variables extend shared inputs with optional `group` and `command`. Values persist in `.devpanel/variables.json`. A variable command runs from the workspace root and receives the selected value as a quoted final argument.

```jsonc
{
  "variables": [
    {
      "name": "environment",
      "type": "choice",
      "options": ["dev", "staging", "prod"],
      "default": "dev",
      "command": "bash .devpanel/scripts/update-environment.sh"
    },
    {
      "name": "debugMode",
      "type": "boolean",
      "default": false
    }
  ]
}
```

## Replacements

Replacements require a Git repository and use `skip-worktree` for tracked targets.

- `file`: requires `source` and `target`.
- `patch`: requires `target` and non-empty `{ search, replace }` entries.
- Paths are workspace-relative or absolute.
- Deactivation restores tracked targets; replacement-created untracked targets are deleted.

```jsonc
{
  "replacements": [
    {
      "name": "local-env",
      "type": "file",
      "source": ".devpanel/replacements/local.env",
      "target": ".env"
    },
    {
      "name": "enable-debug",
      "type": "patch",
      "target": "src/config.ts",
      "patches": [{ "search": "DEBUG = false", "replace": "DEBUG = true" }]
    }
  ]
}
```

## Excludes

- Git Excludes manages `.git/info/exclude`.
- VS Code Excludes manages workspace `files.exclude`.
- Neither belongs in `config.jsonc`.
