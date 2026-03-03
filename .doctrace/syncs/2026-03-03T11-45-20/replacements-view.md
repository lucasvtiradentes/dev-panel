# Sync Report: docs/features/replacements-view.md

**Date**: 2026-03-03T11:45:20
**Status**: UPDATED
**Changes applied**: 4

## Trigger

Doc was flagged because these sources changed:
- `src/common/lib/git.ts` (M, +5/-1) - git diff support
- `src/views/replacements/file-ops.ts` (M, +11/-3) - preview diff support

Related commits:
- `b744954` feat: add preview diff button for replacements
- `d755c0c` fix: preview diff supports new file creation

## Sources reviewed

- `src/views/replacements/replacements-provider.ts` - ReplacementsProvider (activation/deactivation logic)
- `src/views/replacements/file-ops.ts` - file operations (computePatchedContent, applyPatches)
- `src/common/lib/git.ts` - git operations (getFileContent, fileExistsInGit)
- `src/commands/internal/replacements/preview-replacement-diff.ts` - new preview diff command
- `src/commands/internal/replacements/go-to-replacement-target-file.ts` - go to target command
- `src/commands/internal/replacements/toggle-replacement.ts` - toggle command
- `src/views/replacements/keybindings-local.ts` - keybinding registration
- `src/views/replacements/state.ts` - state helpers
- `docs/architecture.md` - required doc (state management reference)
- `docs/features/git-excludes.md` - related doc

## Issues found and fixed

### 1. Missing source in frontmatter

**Type**: Missing reference
**Location**: Frontmatter `sources` list

The `preview-replacement-diff.ts` command file was added in commit `b744954` and implements the Preview Diff feature already documented in the Actions table and Preview Diff subsection. The frontmatter did not list it as a source.

**Fix**: Added `src/commands/internal/replacements/preview-replacement-diff.ts` to frontmatter sources.

### 2. Activation flow diagram missing conditional skip-worktree

**Type**: Factual inaccuracy
**Location**: Activation Flow diagram

The diagram showed `Set skip-worktree` as an unconditional step. In `replacements-provider.ts` (lines 242-245), skip-worktree is only set when `fileExistsInGit` returns true. For file-type replacements that create new files (target not in git), skip-worktree is skipped. This was relevant before the flagged commits but became more important with the new file creation support in `d755c0c`.

**Fix**: Updated diagram to show `File exists in git?` conditional branch, with skip-worktree only on the `yes` path.

### 3. Deactivation flow diagram missing new file deletion path

**Type**: Factual inaccuracy
**Location**: Deactivation Flow diagram and description

The diagram showed only `Unset skip-worktree -> git checkout -- target`. In `replacements-provider.ts` (lines 270-281), when the target file does not exist in git, the code deletes the target file instead of running skip-worktree/checkout. The prose "The target file is restored to its git state" was incomplete.

**Fix**: Updated diagram to show `File exists in git?` conditional branch with two paths: skip-worktree+checkout (yes) and file deletion (no). Updated description to explain both cases.

### 4. Preview Diff description inaccurate

**Type**: Factual inaccuracy
**Location**: Preview Diff subsection

The doc stated "Left: Original file (from git) / Right: Modified file (after replacement)". The actual implementation in `preview-replacement-diff.ts` behaves differently depending on active state:
- When inactive: Left = current file (original), Right = after toggle ON (with replacement applied)
- When active: Left = current file (with replacement), Right = after toggle OFF (original from git)

The doc's description was incorrect for the active case (sides were swapped) and didn't distinguish the two states.

**Fix**: Replaced with accurate description of both active and inactive states matching the code's `computeDiffContent` function.

## Items verified as correct (no changes needed)

- Replacement Types table: matches `ReplacementType` enum (File, Patch)
- Configuration examples: match schema structure
- Properties table: all properties accurate with correct types and descriptions
- Git Skip-Worktree commands: match `Git.setSkipWorktree` and `Git.restoreFile` implementations
- UI Status Indicator: matches `VscodeIcons.ActiveItem` usage in `ReplacementTreeItem`
- Actions table: all 5 actions verified against source (Toggle, Preview Diff, Go to Target, Toggle All, Toggle Group Mode)
- Patch Matching description: matches `computePatchedContent` using `replaceAll`
- Unmatched patch warning: matches code behavior in `applyPatches`
- State Persistence: matches `state.ts` exports (activeReplacements, lastBranch)
- Branch change sync: matches `handleBranchChange` in provider
- Requirements: all three requirements match validation checks in `activateReplacement`
