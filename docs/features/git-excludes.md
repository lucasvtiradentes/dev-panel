---
title:       Git Excludes
description: Manage local git exclude patterns from the sidebar
related_docs:
  - docs/features/replacements-view.md:  related git features
sources:
  - src/views/excludes/excludes-provider.ts: ExcludesProvider
  - src/views/excludes/file-ops.ts:          exclude file operations
---

# Git Excludes

The Excludes view manages `.git/info/exclude` patterns directly from the VSCode sidebar.

## What is .git/info/exclude?

A local-only gitignore file that:
- Works like `.gitignore` but is not committed
- Only affects your local repository
- Perfect for personal tooling files, IDE configs, local scripts

Location: `<workspace>/.git/info/exclude`

## Features

### View Patterns

Lists all patterns from `.git/info/exclude`:

```
Excludes
├── .devpanel/
├── .claude/
├── personal-notes.md
└── *.local
```

### Add Pattern

1. Click `+` icon in title bar
2. Enter pattern (e.g., `*.log` or `temp/`)
3. Pattern appended to exclude file

### Remove Pattern

1. Click trash icon on pattern item
2. Pattern removed from exclude file

### Open File

Click file icon in title bar to open `.git/info/exclude` for bulk editing.

## Pattern Syntax

Same as `.gitignore`:

| Pattern      | Matches                   |
|--------------|---------------------------|
| `*.log`      | All .log files            |
| `temp/`      | temp directory            |
| `/build`     | build folder at root only |
| `!important` | Exception (do not ignore) |
| `**/cache`   | cache folder at any level |

## Data Flow

```
┌───────────────────┐    ┌───────────────────┐    ┌─────────────────┐
│ User adds pattern │───→│ Append to         │───→│ Refresh view    │
│                   │    │ .git/info/exclude │    │                 │
└───────────────────┘    └───────────────────┘    └─────────────────┘
```

## File Watcher

The ExcludesWatcher monitors `.git/info/exclude`:
- Auto-refreshes view on external changes
- Syncs with manual file edits

## Requirements

- Workspace must be a git repository
- `.git/info/exclude` file is created automatically if missing

## Use Cases

- Exclude personal IDE files (`.idea/`, `.vscode/`)
- Exclude local development scripts
- Exclude generated files not in `.gitignore`
- Exclude OS-specific files (`.DS_Store`, `Thumbs.db`)
- Exclude local config overrides
