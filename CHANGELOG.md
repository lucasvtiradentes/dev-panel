# dev-panel

## 1.0.0

### Major Changes

- e68d49d: feat: standardize commands, config, and paths on the workspace root

  BREAKING:

  - Remove `useConfigDir`; tasks and variable commands always run from the owning workspace root
  - Fix Dev Panel config location to `<workspace>/.devpanel`
  - Remove custom config-location state and behavior
  - Reject legacy task fields instead of providing fallback or backward compatibility

  Prefix config-local scripts with `.devpanel/`.

- 0a1610b: feat: unify variable and task input types

  BREAKING:

  - Replace variable `kind` with `type`
  - Rename variable `choose`, `input`, and `toggle` to `choice`, `text`, and `boolean`
  - Replace task input `confirm` with `boolean`
  - Replace task input `multichoice` with `choice` plus `multiSelect: true`
  - Reject all legacy input definitions without fallback or backward compatibility

  Variables and task inputs now share the same schema and collection runtime while retaining persistent and ephemeral lifecycles.

- 17e1e66: feat: manage task scan ignores in workspace state

  BREAKING: remove `taskScanIgnorePaths` from `config.jsonc`. Legacy config entries are rejected without migration or fallback.

  - Add built-in scan ignores for `.git`, `.next`, `dist`, `dist-*`, `node_modules`, and `out`
  - Add a command and Tasks view action to manage custom ignored folders
  - Persist custom paths per active workspace
  - Share one scanner between npm and Makefile task sources

### Minor Changes

- 0fe4981: feat: add active workspace selection for multi-root workspaces

  - Add a workspace selector in the status bar for multi-root windows
  - Scope views and persisted UI state to the active workspace
  - Expose task view location as a public command
  - Remove the previous status bar settings menu

- 89f0534: feat: add interactive Git and VS Code exclude views

  - Add a VS Code Excludes view backed by `files.exclude`
  - Rename the existing view to Git Excludes
  - List workspace-root files and folders for click-to-toggle visibility
  - Add all/excluded filters and file/folder grouping with persisted view state
  - Support linked-directory detection and multi-workspace isolation

- 8bc821d: Add machine-global actions with a compact status bar launcher, configurable working directories, task-style inputs, progress notifications, and dynamic keyboard shortcut commands.

### Patch Changes

- 89f0534: fix: improve task view source, grouping, and scan-ignore controls

  - Show the active task source as the view description
  - Make grouped/flat mode work with multiple package.json and Makefile locations
  - Preserve location order and prefix flat task labels with their source path
  - Show scan-ignore controls only for recursive npm and Makefile sources
  - Hide built-in scan ignores from the management menu

## 0.7.2

### Patch Changes

- 8c1242c: Allow same-name tasks from different groups or locations to run concurrently and show location-aware terminal names.

## 0.7.1

### Patch Changes

- 5d4168d: fix: qualify task favorite/hidden state key with location

  Favorite and hidden state for tasks was keyed only by bare task name. In monorepos with multiple subpackages sharing script names (e.g. `dev`), toggling favorite on one subpackage visually marked every other subpackage's `dev` script as favorited. The same bug class affected hidden items and the "show only favorites" filter across all task sources (package.json, Makefile, VSCode, DevPanel). State keys are now qualified by workspace folder and relative path so tasks in different locations no longer collide.

- 1238b01: fix: pick default task source based on what the repo actually has

  When opening a repo without a `.devpanel` folder, the tasks view defaulted to the DevPanel source even when the repo already had `package.json`, `Makefile`, or `.vscode/tasks.json`. It now resolves the initial source through an availability-aware priority (Package → Makefile → VSCode → DevPanel), with DevPanel as a last resort. The same priority is used when a previously selected source becomes unavailable, replacing the hardcoded DevPanel fallback.

## 0.7.0

### Minor Changes

- 2cb70d4: feat: add taskScanIgnorePaths config to ignore directories when scanning for task sources

  - New `taskScanIgnorePaths` option in config.jsonc to exclude directories from package.json and Makefile scanning
  - Strip `$schema` line from config.jsonc when initializing workspace

## 0.6.0

### Minor Changes

- c323cff: feat: dynamic task source availability

  - Task sources (VSCode, npm, Makefile) only show if their files exist
  - Switch button cycles only through available sources
  - Falls back to DevPanel if current source file is deleted
  - File watcher auto-refreshes on tasks.json, package.json, and Makefile changes

### Patch Changes

- c323cff: fix: complete Makefile task source integration

  - Add switch source button for Makefile task view
  - Add open config support for Makefile source
  - Fix group toggle visibility (always available regardless of source)

## 0.5.2

### Patch Changes

- cc3941e: fix: include process.env in task shell execution

## 0.5.1

### Patch Changes

- fbe2646: fix: resolve ${workspaceFolder} in hideTerminal tasks

  - Fix variable substitution when running tasks with hideTerminal enabled
  - Remove ~600 lines of dead code (-16kb bundle size)
  - Improve type safety by removing `as any` casts

## 0.5.0

### Minor Changes

- b0e8dbd: feat: overhaul file/folder selection in inputs

  - Add variable substitution in includes/excludes patterns (`$VAR_NAME`)
  - Support mixed `../` depths in patterns (robust grouping)
  - Inputs respect `useConfigDir` setting
  - Fix keybinding to read fresh config on execution
  - Remove global `settings.include`/`settings.exclude` (move patterns to each input)

## 0.4.1

### Patch Changes

- 076d4ef: fix: prevent duplicate release when tag already exists

## 0.4.0

### Minor Changes

- a1a6bb7: feat: add preview diff button for replacements (shows diff before toggle)
  feat: add excludes watcher (auto-refresh when .git/info/exclude changes)
  fix: go-to-task opens correct file for VSCode tasks
  fix: allow multiple VSCode tasks from same group to run simultaneously

## 0.3.1

### Patch Changes

- 2167668: fix: tasks now run from workspace root by default, use `useConfigDir: true` to run from .devpanel dir

## 0.3.0

### Minor Changes

- ec2b55e: feat: add Excludes view to manage .git/info/exclude patterns
- feat: workspace-scoped keybindings with opt-in toast prompt
  feat: show keybindings in task/variable tree item descriptions
  refactor: unified toggle favorite/hide with context-aware labels
  fix: keybindings filter not working when opening from view
  chore: removed copy task to global/workspace commands

### Patch Changes

- fix: preserve user when clauses when scoping keybindings to workspace

## 0.2.0

### Minor Changes

- 4c33ae0: feat: add configurable tasks view location (explorer or devpanel sidebar)

## 0.1.0

### Minor Changes

- b036649: refactor: remove tools and prompts features

## 0.0.9

### Patch Changes

- 032cd39: fix: add windows cross-platform compatibility for CLI paths and shell commands
  refactor: remove registry feature

## 0.0.8

### Patch Changes

- 3dce25b: feat: add renamed files (R) status support in changed files view
- 3dce25b: refactor: consolidate state management, extract shared utilities and base providers
- d9ced1c: fix: global items toggle and keybinding now work correctly

## 0.0.7

### Patch Changes

- 7a667ed: fix duplicated command register

## 0.0.6

### Patch Changes

- a9ac494: fix template file

## 0.0.5

### Patch Changes

- a621dde: revert deployment process

## 0.0.4

### Patch Changes

- d017704: fix vscode extension release

## 0.0.3

### Patch Changes

- 8e92faa: simplify publish process

## 0.0.2

### Patch Changes

- 492a803: initial release
