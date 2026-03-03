# Sync Report: docs/rules.md

## Summary

The document is largely accurate. One factual fix was applied to a parameter name in a code example. No references to deleted files were found. No references to removed features (prompts, tools) were found.

## Changes Applied

### 1. Fixed `StateManager` parameter name (lines 153-154)

- **Section:** State Management > StateManager Interface
- **Issue:** The documented `StateManager` type used parameter name `grouped` but the actual type in `src/views/_view_base/types.ts` uses `isGrouped`.
- **Fix:** Changed `grouped` to `isGrouped` in both `getOrder` and `saveOrder` method signatures.
- **Source:** `src/views/_view_base/types.ts` (line 16-17)

## No Change Needed

### Deleted files not referenced

The doc does not reference any of the deleted files (`base-provider.ts`, `item-factory.ts`, `global.ts`, `helpers.ts`). No cleanup needed.

### Removed features not referenced

The doc does not mention the removed "prompts" or "tools" features. No cleanup needed.

### Frontmatter sources still valid

All three source directories listed in frontmatter still exist:
- `src/common/utils/helpers/` - exists
- `src/common/schemas/` - exists
- `src/views/` - exists

### Helper directory listing accurate

The file listing under "Domain Organization" (lines 42-51) matches the actual directory contents exactly.

### Schema file reference valid

The reference to `src/common/schemas/config-schema.ts` on line 104 is still accurate.

## Notes (no action taken)

### Zod schema example is simplified

The Zod example (lines 94-101) shows `DevPanelTaskSchema` as exported with only 4 fields (`name`, `command`, `group`, `hideTerminal`). The actual schema is not exported and has 7 fields (adds `description`, `inputs`, `useConfigDir`). Similarly, `DevPanelTask` type is not exported from the schema file. However, this section illustrates a coding pattern/convention rather than documenting the exact schema, so no change was made. The schema's actual structure is a documentation concern for a different doc.

### StateManager shown as simplified

The doc shows only `getOrder` and `saveOrder` from the `StateManager` type, which actually has 14 methods. This is acceptable since the doc focuses on the drag-and-drop ordering pattern, and the description "Used by drag-and-drop controller for consistent ordering" accurately reflects how these two methods are consumed.
