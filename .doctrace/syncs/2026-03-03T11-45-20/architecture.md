# Sync Report: docs/architecture.md

**Date:** 2026-03-03T11:45:20
**Status:** UPDATED

## Changes Applied

### 1. Activation flow missing two steps (lines 57-61)

**Issue:** The activation flow diagram listed 6 steps (setupStatesAndContext through setupCommands), but `src/extension.ts` now has 8 steps. Two functions were added as part of recent changes: `setupDisposables` and `setupConfigChangeListener`. The latter was introduced by commit `4c33ae0 feat: add configurable tasks view location` and listens for `TasksLocation` setting changes to swap the active tasks tree view.

**Fix:** Inserted steps 5 (`setupDisposables`) and 6 (`setupConfigChangeListener`) between `setupTreeViews` and `setupWatchers`, renumbering subsequent steps to 7 and 8.

**Source:** `src/extension.ts` lines 110-134, 193-201

### 2. KeybindingsWatcher pattern and actions incorrect (lines 204-207)

**Issue:** The doc stated `Pattern: .vscode/keybindings.json (workspace)` which suggests a workspace-local file. The actual code in `src/watchers/keybindings-watcher.ts` watches the global user `keybindings.json` file (e.g., `~/.config/Code/User/keybindings.json`) using `getVSCodeKeybindingsPath()`. Additionally, the watcher was significantly modified (+120/-53 lines) in commit `99f0472 feat: workspace-scoped keybindings with toast prompt` to add logic that detects unscoped DevPanel keybindings and prompts the user to scope them to the current workspace.

**Fix:** Changed pattern to `keybindings.json (global user config)` and added the workspace-scoping prompt to the actions list.

**Source:** `src/watchers/keybindings-watcher.ts` lines 103-156, `src/common/vscode/vscode-keybindings-utils.ts` lines 28-29

## Pre-existing Issues (Not Fixed)

### 3. Command counts in table may be approximate

The Command Registration table lists Tasks=12, Variables=6. Actual counts from `src/commands/register-all.ts` are higher when counting individual command registrations within spread functions (e.g., `createToggleTasksViewCommands` returns 10 commands, `createSwitchTaskSourceCommands` returns 3). However, many of these are toggle variant pairs (e.g., ToggleHide/ToggleUnhide) that represent the same logical operation. The counts were not changed by recent commits, so this is a pre-existing discrepancy. The "30+ commands" claim in the activation flow remains accurate.

### 4. ConfigWatcher pattern incomplete

The doc states `Pattern: **/.devpanel/config.jsonc` but the actual pattern in `src/watchers/config-watcher.ts` is `**/.devpanel/{config.jsonc,variables.json}` -- it also watches the variables file. This was not changed by recent commits, so it was left as-is.

## Sections Verified (No Issues)

- **Frontmatter sources:** All listed paths still exist. No deleted files referenced.
- **View Architecture:** Accurately shows Variables, Replacements, Excludes, and Task Runner views with correct view IDs and provider class names. Matches `src/extension.ts` lines 86-108.
- **Data Flow:** ConfigManager.parseConfig and TreeDataProvider flow is accurate per `src/common/core/config-manager.ts`.
- **State Management:** tasksState, variablesState, replacementsState structure not affected by changes.
- **Task Execution Flow:** Not affected by recent changes.
- **ExcludesWatcher:** Pattern `**/.git/info/exclude` matches source. Actions match.
- **Logging:** Format description matches existing logger implementation.
- **Status Bar:** Icon, tooltip, and click behavior match `src/status-bar/status-bar-manager.ts`. The settings menu now includes a "Change Tasks Location" option (from `src/status-bar/status-bar-actions/tasks-location.ts`), but the doc only describes the status bar item itself, not the menu contents, so no update needed.
- **Related docs:** Both `docs/features/task-runner.md` and `docs/features/variables-manager.md` exist.
