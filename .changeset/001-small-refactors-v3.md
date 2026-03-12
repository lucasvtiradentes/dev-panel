---
"dev-panel": patch
---

fix: resolve ${workspaceFolder} in hideTerminal tasks

- Fix variable substitution when running tasks with hideTerminal enabled
- Remove ~600 lines of dead code (-16kb bundle size)
- Improve type safety by removing `as any` casts
