# Sync Report: docs/features/git-excludes.md

## Sources Reviewed

- `src/views/excludes/excludes-provider.ts` - ExcludesProvider class, ExcludeTreeItem, refreshExcludes
- `src/views/excludes/file-ops.ts` - readExcludeFile, addExcludeEntry, removeExcludeEntry, ensureExcludeFileExists, getExcludeFilePath
- `src/views/excludes/index.ts` - re-exports
- `src/commands/internal/excludes/add-exclude.ts` - add exclude command
- `src/commands/internal/excludes/remove-exclude.ts` - remove exclude command
- `src/commands/internal/excludes/open-exclude-file.ts` - open exclude file command
- `src/watchers/excludes-watcher.ts` - file system watcher for exclude file
- `src/extension.ts` - extension activation, provider registration, watcher setup

## Related Docs Reviewed

- `docs/features/replacements-view.md` - exists and cross-references git-excludes correctly

## Issues Found

### 1. FIXED: Incorrect requirement about .git/info/exclude file existence

- **Section**: Requirements
- **Old content**: `.git/info/exclude` file must exist (created by git init)
- **New content**: `.git/info/exclude` file is created automatically if missing
- **Reason**: `ensureExcludeFileExists()` in `src/views/excludes/file-ops.ts` (lines 17-29) explicitly creates the file and its parent directory if they don't exist. This function is called by `addExcludeEntry()` and by the `open-exclude-file` command before opening the file. The file is not required to pre-exist.

## No Change Needed

- **Title/Intro**: Accurately describes the Excludes view managing `.git/info/exclude` from the sidebar.
- **What is .git/info/exclude?**: General git knowledge, accurate.
- **View Patterns**: Correctly describes tree listing of patterns from `readExcludeFile`.
- **Add Pattern**: Accurately describes the input box flow (`showInputBox` in add-exclude command) and append behavior (`addExcludeEntry`).
- **Remove Pattern**: Accurately describes removal via `removeExcludeEntry`.
- **Open File**: Accurately describes opening the exclude file for bulk editing.
- **Pattern Syntax**: Standard gitignore syntax reference, accurate.
- **Data Flow**: Correctly shows: user adds pattern -> append to file -> refresh view (matches `add-exclude.ts` flow).
- **File Watcher**: Correctly describes auto-refresh on external changes. `createExcludesWatcher` watches `**/.git/info/exclude` and calls `excludesProvider.refresh()` on change/create/delete events.
- **Use Cases**: Generic suggestions, no factual claims to verify.

## Frontmatter Changes

- **sources**: No changes. The two listed sources (`excludes-provider.ts`, `file-ops.ts`) are the core files. Commands and watcher are secondary implementation details.
- **related_docs**: No changes. `replacements-view.md` exists and cross-references this doc.

## Summary

1 fix applied. The doc was largely accurate. The only factual error was claiming the exclude file must pre-exist when the code explicitly creates it if missing.
