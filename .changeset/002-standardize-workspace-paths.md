---
"dev-panel": major
---

feat: standardize commands and paths on the workspace root

BREAKING: remove `useConfigDir`. DevPanel tasks and variable commands now always run from the owning workspace root. Prefix config-local scripts with `.devpanel/`.
