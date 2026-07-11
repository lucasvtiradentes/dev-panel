---
title:       Global Actions
description: Machine-global commands available from every workspace
required_docs:
  - docs/architecture.md: global action lifecycle and execution
related_docs:
  - docs/features/task-runner.md: shared inputs and keybinding behavior
sources:
  - src/global-actions/global-actions-manager.ts: config loading, status bar, execution, and keybindings
  - src/commands/public/global-actions-config.ts: create/reuse and remove config commands
  - src/common/schemas/config-schema.ts: GlobalActionsConfigSchema
  - resources/templates/global-actions.jsonc: seed copied when creating a config
---

# Global Actions

Global Actions are machine-level shell commands available from every workspace without changing each workspace's `.devpanel/config.jsonc`.

## Configuration path

Run `Dev Panel: Configure Global Actions` and paste an absolute folder path. Dev Panel creates or reuses `devpanel-actions.jsonc`, stores its absolute path in the machine-scoped `devPanel.globalActionsConfigPath` setting, and opens it. New files are copied from `resources/templates/global-actions.jsonc`, which contains an example action.

Run `Dev Panel: Remove Global Actions Config` to detach the config. The file is never deleted.

VS Code automatically applies `resources/schemas/global-actions.schema.json` to files named `devpanel-actions.jsonc`, providing validation and IntelliSense without a manual `$schema` property.

## Configuration

```jsonc
{
  "actions": [
    {
      "name": "Sync repos",
      "description": "Synchronize the repos repository",
      "command": "./sync.sh",
      "cwd": "${userHome}/_custom/repos/github_lucasvtiradentes/repos",
      "customNotification": true
    }
  ]
}
```

Actions support the same `inputs` used by DevPanel tasks. Input placeholders use `$name`.

## Working directory

- Default: active Dev Panel workspace root.
- Relative `cwd`: resolved from the active workspace root.
- Absolute `cwd`: used directly.
- `${workspaceFolder}` and `${userHome}` are supported in `cwd` and `command`.
- Without an active workspace, an absolute `cwd` is required.

## Execution

Click `$(globe) Actions` in the status bar and select an action. Execution uses a progress notification named `Running: <action>` which disappears when complete.

When `customNotification` is `true`, exit code `0` shows the last non-empty stdout line as an information notification, while a non-zero exit shows the last non-empty stderr line as an error notification. Missing output falls back to a generic action message. When omitted, failures use the standard detailed error.

## Keybindings

Each action registers a dynamic command named `devPanel.action.<name>`. Open VS Code Keyboard Shortcuts, search for Dev Panel, and assign a shortcut. Editing the global config reloads the commands automatically. Renaming an action changes its command ID and does not migrate an existing shortcut.
