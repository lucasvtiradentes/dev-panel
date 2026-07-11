---
"dev-panel": major
---

feat: manage task scan ignores in workspace state

BREAKING: remove `taskScanIgnorePaths` from `config.jsonc`. Legacy config entries are rejected without migration or fallback.

- Add built-in scan ignores for `.git`, `.next`, `dist`, `dist-*`, `node_modules`, and `out`
- Add a command and Tasks view action to manage custom ignored folders
- Persist custom paths per active workspace
- Share one scanner between npm and Makefile task sources
