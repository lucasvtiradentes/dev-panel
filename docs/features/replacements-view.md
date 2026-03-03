---
title:       Replacements View
description: File replacement and patching with git skip-worktree
required_docs:
  - docs/architecture.md:           state management
related_docs:
  - docs/features/git-excludes.md:  related git features
sources:
  - src/views/replacements/replacements-provider.ts:                    ReplacementsProvider
  - src/views/replacements/file-ops.ts:                                 file operations
  - src/common/lib/git.ts:                                              git operations
  - src/commands/internal/replacements/preview-replacement-diff.ts:     preview diff command
---

# Replacements View

Replacements allow temporary file modifications that are hidden from git status using `skip-worktree`.

## Replacement Types

| Type  | Description                   | Use Case                     |
|-------|-------------------------------|------------------------------|
| file  | Replace entire file content   | Config overrides, mock files |
| patch | Apply search/replace patterns | Partial modifications        |

## Configuration

### File Replacement

```jsonc
{
  "replacements": [
    {
      "name": "local-config",
      "type": "file",
      "source": ".devpanel/configs/local.env",
      "target": ".env",
      "group": "Environment",
      "description": "Use local environment"
    }
  ]
}
```

### Patch Replacement

```jsonc
{
  "replacements": [
    {
      "name": "debug-mode",
      "type": "patch",
      "target": "src/config.ts",
      "patches": [
        {
          "search": "DEBUG = false",
          "replace": "DEBUG = true"
        },
        {
          "search": "LOG_LEVEL = 'error'",
          "replace": "LOG_LEVEL = 'debug'"
        }
      ]
    }
  ]
}
```

## Properties

| Property    | Type    | Description                          |
|-------------|---------|--------------------------------------|
| name        | string  | Unique identifier                    |
| type        | string  | "file" or "patch"                    |
| target      | string  | Target file path (relative)          |
| source      | string  | Source file path (file type only)    |
| patches     | array   | Search/replace patterns (patch type) |
| group       | string? | Group for organizing                 |
| description | string? | Tooltip text                         |

## Activation Flow

```
┌──────────────┐    ┌──────────────────┐    ┌─────────────────────────┐
│ Click toggle │───→│ Check git repo   │───→│ File exists in git?     │
└──────────────┘    └──────────────────┘    └─────────────────────────┘
                                               yes │            │ no
                                                   v            │
                                            ┌─────────────────┐ │
                                            │ Set skip-       │ │
                                            │ worktree        │ │
                                            └─────────────────┘ │
                                                   │            │
                    ┌──────────────────────────────┘────────────┘
                    v
          ┌─────────────────────────────────────────────────────┐
          │                    Apply Changes                    │
          │  ┌───────────────────┐    ┌──────────────────────┐  │
          │  │ type: file        │    │ type: patch          │  │
          │  │ Copy source →     │    │ Read target file     │  │
          │  │ target            │    │ Apply search/replace │  │
          │  │                   │    │ Write back           │  │
          │  └───────────────────┘    └──────────────────────┘  │
          └─────────────────────────────────────────────────────┘
```

## Deactivation Flow

```
┌──────────────┐    ┌─────────────────────────┐
│ Click toggle │───→│ File exists in git?     │
│ (active)     │    └─────────────────────────┘
└──────────────┘       yes │            │ no
                           v            v
                    ┌─────────────┐  ┌──────────────┐
                    │ Unset skip- │  │ Delete       │
                    │ worktree    │  │ target file  │
                    │ + checkout  │  │              │
                    └─────────────┘  └──────────────┘
```

If the target existed in git, it is restored to its git state. If it was created by the replacement (not in git), the file is deleted.

## Git Skip-Worktree

Skip-worktree tells git to assume the file is unchanged:

```bash
# When activated
git update-index --skip-worktree <file>

# When deactivated
git update-index --no-skip-worktree <file>
git checkout -- <file>
```

This allows:
- Local modifications without appearing in `git status`
- Clean commits without accidentally including changes
- Branch switching preserves skip-worktree state

## UI Features

### Status Indicator

| State    | Icon          |
|----------|---------------|
| Active   | Filled circle |
| Inactive | No icon       |

### Actions

| Action            | Location      | Description               |
|-------------------|---------------|---------------------------|
| Toggle            | Click item    | Activate/deactivate       |
| Preview Diff      | Inline button | Show changes in diff view |
| Go to Target      | Inline button | Open target file          |
| Toggle All        | Title bar     | Activate/deactivate all   |
| Toggle Group Mode | Title bar     | Flat/grouped view         |

### Preview Diff

Opens a diff view showing what will change on toggle:
- When inactive: Left = current file, Right = after toggle ON (with replacement)
- When active:   Left = current file, Right = after toggle OFF (original)

## Patch Matching

Patches use exact string matching:

```
Original file:
const DEBUG = false;
const LOG_LEVEL = 'error';

Patch: { "search": "DEBUG = false", "replace": "DEBUG = true" }

Result:
const DEBUG = true;
const LOG_LEVEL = 'error';
```

If a patch search string is not found, a warning notification appears.

## State Persistence

Active replacements are stored in workspace state:

```json
{
  "activeReplacements": ["local-config", "debug-mode"],
  "lastBranch": "main"
}
```

Branch changes trigger state sync to verify replacement status.

## Requirements

- Workspace must be a git repository
- Target files must exist (for patches)
- Source files must exist (for file replacements)
