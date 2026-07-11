# Dev Panel Simplification and Multi-Workspace Plan

## Goal

Simplify configuration and path resolution while preparing Dev Panel for VS Code multi-root workspaces. Changes must remove implicit behavior, keep each workspace isolated, and avoid introducing reusable-input indirection before there is a concrete need.

## Agreed Decisions

- Multi-workspace architecture comes first.
- Every relative path and command runs from the owning `WorkspaceFolder`.
- `useConfigDir` will be removed.
- `taskScanIgnorePaths` will move from `config.jsonc` to extension workspace state.
- Variables and task inputs will share one input type system and runtime.
- The shared discriminator will be `type`, not `kind`.
- Definitions remain inline; no top-level reusable input references initially.
- Replacements remain operations, not inputs.
- The current Dev Panel status-bar item and settings menu will be removed.
- A new discreet status-bar workspace selector will appear only in multi-workspace windows.
- Task view location will be managed through a public command.

## 1. Implement Multi-Workspace Architecture

### Objective

Replace the current first-workspace behavior with an explicit context for every open `WorkspaceFolder`.

### Design

Create a workspace-scoped model containing at least:

```ts
type WorkspaceContext = {
  folder: WorkspaceFolder;
  workspaceId: string;
  rootPath: string;
  configPath: string;
};
```

Each config, variable, task, replacement, exclude entry, watcher, command, and state operation must know its owning workspace. Domain code must not call `getFirstWorkspacePath()` to infer scope.

### Active Workspace and View Behavior

Views show data only from the active workspace. They do not aggregate or group entries from every open project.

When one workspace is open, it is selected implicitly and the workspace selector is hidden. When multiple workspaces are open, the user selects the active workspace through the status bar. Changing it refreshes:

- Variables
- Replacements
- VS Code Excludes
- Git Excludes
- Tasks
- workspace-scoped commands, state, and watchers

This keeps the current compact view structure regardless of how many folders are open.

### Status Bar

Remove the current left-aligned Dev Panel status item, variable tooltip, and `OpenSettingsMenu` flow.

Replace it with a discreet, right-aligned, icon-only workspace selector inspired by `mention-at-agent`:

```text
$(folder)
```

Behavior:

- hidden when zero or one workspace folder is open;
- visible only when two or more workspace folders are open;
- click opens a Quick Pick listing open workspaces;
- tooltip shows the active workspace and explains the click action;
- active selection is persisted for the current multi-root window;
- if the active folder is removed, select the first remaining folder deterministically;
- refresh immediately when folders are added or removed.

The selector has one responsibility only: choosing the active workspace. It must not expose config initialization, config location, task location, variables, or general settings.

### Public Commands

Remove `Change Tasks Location` from the old status-bar menu and expose it directly as a public Command Palette command:

```text
Dev Panel: Change Tasks Location
```

Keep the underlying Explorer/Dev Panel selection behavior, but make the command independently discoverable and keybindable.

The config-location action should be removed together with configurable config location once `.devpanel` is standardized at each workspace root. Initialization, if retained, must be a separate public command and not part of the workspace selector.

### Commands

Every tree item must carry its workspace context. Commands receive the clicked item and operate only on that workspace. Title-bar commands operate on the active workspace selected through the status bar. Commands that explicitly target all workspaces must say so in their title and confirmation.

No silent fallback to the first workspace.

### State

Persist state by stable workspace-folder URI:

```text
workspace folder URI
└── feature state
    ├── tasks
    ├── variables
    ├── replacements
    ├── git excludes
    └── vscode excludes
```

Task favorites, hidden items, ordering, selected source, grouping, and filters must remain isolated per workspace.

### Watchers

Create workspace-aware watchers or one watcher that resolves events back to their owning workspace. Creating, changing, or removing a workspace folder at runtime must initialize or dispose its resources correctly.

### Acceptance Criteria

- Opening three folders allows selecting each folder and displays only its data.
- Same-named items from different workspaces never share state or execution identity.
- Commands operate on the active workspace or the workspace represented by the clicked item.
- Adding/removing workspace folders updates selection and views without restarting VS Code.
- The workspace status item is right-aligned, icon-only, and visible only with multiple folders.
- `Dev Panel: Change Tasks Location` is available in the Command Palette.
- The old status item and settings menu no longer exist.
- Single-workspace UX remains compact and has no workspace status item.
- No domain flow depends on `getFirstWorkspacePath()`.

## 2. Standardize Workspace-Relative Paths

### Objective

Make the owning workspace root the single base directory for commands and relative paths.

### Changes

- Tasks always execute with `cwd` set to the owning workspace root.
- Variable commands also execute from the owning workspace root.
- Relative replacement `source` and `target` paths resolve from the owning workspace root.
- File/folder inputs search within the owning workspace.
- `${workspaceFolder}` resolves to the owning workspace, never the first open workspace.

Example:

```jsonc
{
  "command": "bash .devpanel/tasks/api/restart.sh"
}
```

### Absolute Paths

Keep absolute paths supported for intentional cross-repository integrations, but never generate or require them for normal workspace-local behavior.

### Acceptance Criteria

- Identical configs work regardless of machine username or repository location.
- Symlinked `.devpanel` directories do not change command cwd semantics.
- A task in Project B cannot accidentally execute from Project A.

## 3. Remove `useConfigDir`

### Objective

Eliminate implicit cwd switching and one-off path semantics.

### Migration

Convert:

```jsonc
{
  "command": "bash ./tasks/api/run.sh",
  "useConfigDir": true
}
```

into:

```jsonc
{
  "command": "bash .devpanel/tasks/api/run.sh"
}
```

### Compatibility Decision

Before implementation, choose one release strategy:

- **Breaking migration:** remove `useConfigDir` from schema and update configs immediately.
- **Temporary compatibility:** accept it for one release, log a deprecation warning, but migrate examples and documentation to workspace-relative paths.

Preferred approach for a controlled personal setup: breaking migration, because it keeps runtime and schema simpler.

### Acceptance Criteria

- `useConfigDir` no longer exists in schema, generated schema, runtime, docs, or examples.
- Every command has one predictable cwd rule.

## 4. Move Task Scan Ignore Paths to Extension State

### Objective

Remove `taskScanIgnorePaths` from physical project configuration and treat scan exclusions as local editor preferences.

### State Shape

Store values per workspace-folder URI:

```text
workspace URI → task scan ignore paths[]
```

Built-in defaults should include expensive or irrelevant directories such as:

```text
.git
node_modules
dist
out
```

### UX

Add commands accessible from the Tasks view to:

- add an ignored path;
- remove an ignored path;
- inspect current ignored paths;
- reset to defaults.

Paths should be workspace-relative. Existing values from `config.jsonc` can be migrated once into state if backward compatibility is required.

### Trade-Off

These ignores will no longer be shared through Git. This is intentional because they represent local scan/performance preferences. Team-wide task definitions remain in project files.

### Acceptance Criteria

- `taskScanIgnorePaths` is absent from config schema and generated schema.
- Ignore settings are independent per workspace.
- Clearing extension workspace state restores defaults.
- Scan behavior remains deterministic after restarting VS Code.

## 5. Create One Shared Input Type System

### Objective

Remove the current inconsistency between variable `kind` and task input `type` while sharing parsing and input collection code.

### Canonical Types

Use `type` everywhere:

```text
text
number
boolean
choice
file
folder
```

Normalize existing concepts:

```text
variable input       → text
variable toggle      → boolean
task confirm         → boolean
task multichoice     → choice + multiSelect: true
```

### Shared Base Definition

```ts
type InputDefinition = {
  name: string;
  type: InputType;
  label?: string;
  description?: string;
  default?: InputValue;
  options?: string[];
  multiSelect?: boolean;
  includes?: string[];
  excludes?: string[];
};
```

Use discriminated schemas so each type only accepts relevant fields.

### Context-Specific Definitions

Variables extend the common input definition with persistent behavior:

```ts
type VariableDefinition = InputDefinition & {
  command?: string;
  group?: string;
};
```

Task inputs use the shared definition but remain ephemeral and scoped to one execution.

### Runtime

Create one input collector/value normalizer reused by:

- variable selection;
- task input collection;
- file/folder quick picks;
- choice and multi-choice handling;
- boolean handling;
- validation and display formatting where appropriate.

Persistence remains context-specific:

- variables save values;
- task inputs do not persist by default.

### Migration

Examples:

```jsonc
// Before
{ "name": "environment", "kind": "choose" }

// After
{ "name": "environment", "type": "choice" }
```

```jsonc
// Before
{ "name": "enabled", "type": "confirm" }

// After
{ "name": "enabled", "type": "boolean" }
```

```jsonc
// Before
{ "name": "features", "type": "multichoice" }

// After
{ "name": "features", "type": "choice", "multiSelect": true }
```

### Acceptance Criteria

- Variables and task inputs use the same canonical type names.
- Shared schemas and collectors contain common behavior once.
- Persistent and ephemeral lifecycles remain separate.
- Generated schema provides correct autocomplete and validation.

## 6. Keep Definitions Inline

### Objective

Avoid adding configuration references before reuse justifies the complexity.

Do not introduce this initially:

```jsonc
{
  "inputs": {
    "environment": { "type": "choice" }
  },
  "variables": ["environment"]
}
```

Continue using inline definitions. Reuse happens in TypeScript schemas and runtime, not through JSON references.

Reconsider named reusable inputs only if real configs accumulate substantial identical definitions. Any future proposal must define ownership, overrides, validation errors, and multi-workspace resolution first.

## 7. Keep Replacements Separate from Inputs

### Objective

Preserve clear domain boundaries.

Inputs collect values. Replacements perform reversible file operations. Replacements should continue using their own discriminated `type` values:

```text
file
patch
```

Sharing the property name `type` is acceptable because each object is validated in its own context. Do not force replacements into the shared input schema.

Potential replacement improvements, such as group-level toggling, should be planned independently.

## 8. Update Project Configurations and Documentation

After runtime changes:

1. Migrate this repository's `.devpanel/config.jsonc`.
2. Migrate the Kouto `.devpanel/config.jsonc`.
3. Remove avoidable absolute paths.
4. Standardize task paths from workspace root.
5. Update generated JSON schema.
6. Update feature docs and examples.
7. Document multi-workspace behavior and state isolation.
8. Add a migration note for renamed input types and removed fields.

## 9. Validation Strategy

Add coverage for:

- one and multiple workspace folders;
- duplicate item names across workspaces;
- workspace addition/removal at runtime;
- workspace-scoped commands, state, keybindings, and watchers;
- workspace-relative command cwd;
- removal of `useConfigDir`;
- per-workspace task scan ignores;
- each canonical input type;
- variable persistence versus ephemeral task inputs;
- migration or rejection of legacy config fields;
- symlinked `.devpanel` directories.

Run the project validation command after every implementation phase:

```bash
npm run format && npm run lint && npm run typecheck && npm run build
```

## Proposed Implementation Order

1. Multi-workspace context and state isolation.
2. Multi-workspace providers, tree groups, commands, and watchers.
3. Workspace-relative path resolution.
4. Remove `useConfigDir`.
5. Move task scan ignores into extension state and add management UX.
6. Introduce shared input schema and runtime.
7. Migrate variable and task input definitions to canonical `type` values.
8. Migrate repository configs and documentation.
9. Complete integration validation across single-root and multi-root workspaces.

## Open Decisions Before Implementation

1. Should legacy `useConfigDir`, variable `kind`, `confirm`, and `multichoice` receive one release of compatibility, or be removed immediately?
2. Which Codicon should represent the icon-only workspace selector?
3. Should the active workspace be persisted only for the current multi-root window or also restored when the same folder set is reopened differently?
4. Should task scan ignores have only built-in defaults, or should users also configure global defaults shared across all workspaces?
5. Should absolute replacement paths remain unrestricted, or require confirmation when they target outside the owning workspace?
6. Should initialization remain as `Dev Panel: Initialize Workspace`, or should creating `.devpanel/config.jsonc` be entirely manual?
