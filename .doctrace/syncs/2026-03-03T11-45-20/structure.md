# Sync Report: docs/repo/structure.md

**Date:** 2026-03-03T11:45:20
**Status:** Updated
**Changes applied:** 2

---

## Fixes Applied

### 1. `resources/templates/` renamed to `resources/init/`

- **Line:** 64 (original line 63)
- **Type:** Factual error -- directory name wrong
- **Detail:** The doc listed `resources/templates/` but this directory does not exist and never existed in git history. The actual directory is `resources/init/`, which contains `config.jsonc`.
- **Fix:** Changed `templates/` to `init/` in the tree listing. Kept the existing comment "Config templates" as it still accurately describes the purpose.

### 2. Added missing `update-docs.yml` workflow

- **Line:** 52 (inserted)
- **Type:** Missing item in an enumerated list
- **Detail:** The `.github/workflows/` section explicitly listed three workflow files, but a fourth (`update-docs.yml`) was added in commit `184b0a5 chore: add update docs action`. Since the doc enumerates all workflow files, omitting one is a factual gap.
- **Fix:** Added `update-docs.yml` entry with comment "Documentation updates". Adjusted the preceding `callable-ci.yml` tree connector from `└──` to `├──` so `update-docs.yml` is the final entry.

---

## Items Verified (No Changes Needed)

### Top-level structure
- `src/` directory and its subdirectories: all confirmed present
- `src/extension.ts`: confirmed as entry point
- `src/commands/`, `src/views/`, `src/common/`, `src/watchers/`, `src/status-bar/`: all present
- `scripts/` directory and contents (`generate-schema.ts`, `install-local/`, `release/`, `helpers/`): all confirmed
- `.github/actions/setup-and-install/`, `.github/actions/release-vscode/`: confirmed
- `resources/icon.svg`, `resources/icon-colored.png`, `resources/schema.json`: confirmed
- Root files (`package.json`, `tsconfig.json`, `biome.json`, `esbuild.config.ts`, `knip.jsonc`): confirmed

### Commands section
- `register-all.ts`, `internal/execute-task.ts`, `internal/select-config-option.ts`: confirmed
- `internal/excludes/`, `internal/replacements/`, `internal/tasks/`, `internal/variables/`: all present
- `public/show-logs.ts`, `public/show-workspace-state.ts`, `public/clear-workspace-state.ts`: confirmed

### Views section
- `_view_base/` with `base-items.ts`, `base-dnd-controller.ts`, `base-keybindings.ts`, `types.ts`: confirmed
- `tasks/` with all listed files: confirmed
- `variables/` with `variables-provider.ts`, `state.ts`, `keybindings-local.ts`: confirmed
- `replacements/` with `replacements-provider.ts`, `file-ops.ts`, `state.ts`, `keybindings-local.ts`: confirmed
- `excludes/` with `excludes-provider.ts`, `file-ops.ts`: confirmed

### Common section
- `constants/` with `constants.ts`, `enums.ts`, `context-keys.ts`, `scripts-constants.ts`: confirmed
- `core/` with `config-manager.ts`, `extension-store.ts`, `keybindings-sync.ts`, `tree-item-utils.ts`: confirmed
- `lib/` with `git.ts`, `logger.ts`: confirmed
- `schemas/` with `config-schema.ts`, `types.ts`, `shared-state.schema.ts`: confirmed
- `state/` with `base.ts`, `workspace.ts`, `index.ts`: confirmed
- `utils/functions/`, `utils/helpers/`: confirmed
- `vscode/` with `vscode-helper.ts`, `vscode-commands.ts`, `vscode-context.ts`, `vscode-inputs.ts`, `vscode-types.ts`: confirmed

### Frontmatter
- Sources (`src/`, `scripts/`, `.github/`): all valid and relevant
- Related docs (`docs/repo/tooling.md`, `docs/repo/local-setup.md`): both exist and are relevant
- No changes needed to frontmatter

---

## Notes

- The `common/core/` listing in the doc shows 4 files but the actual directory has 8. The doc is not wrong (it never claims to be exhaustive), but it omits: `config-item-operations.ts`, `keybindings-registration.ts`, `package-json-helper.ts`, `variables-env-manager.ts`. Per conservative editing rules, no additions made since the existing entries are accurate.
- The `common/constants/` listing omits several files (`functions.ts`, `index.ts`, `regex-constants.ts`, `task-constants.ts`, `vscode-constants.ts`). Same reasoning -- not added.
- The `common/vscode/` listing omits `vscode-constants.ts`, `vscode-icons.ts`, `vscode-keybindings-utils.ts`, `vscode-watcher.ts`, `vscode-workspace.ts`. Same reasoning -- not added.
- The `common/schemas/` listing omits `index.ts` and `workspace-state.schema.ts`. Same reasoning -- not added.
- The `resources/` listing is missing `icon-colored.svg` that exists alongside `icon-colored.png`. Not added per conservative rules.
- The tools and prompts features (removed in commits `193c2c2` and `4978607`) were never listed in this doc, so no removals needed.
