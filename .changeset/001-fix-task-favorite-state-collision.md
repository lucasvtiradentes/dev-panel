---
"dev-panel": patch
---

fix: qualify task favorite/hidden state key with location

Favorite and hidden state for tasks was keyed only by bare task name. In monorepos with multiple subpackages sharing script names (e.g. `dev`), toggling favorite on one subpackage visually marked every other subpackage's `dev` script as favorited. The same bug class affected hidden items and the "show only favorites" filter across all task sources (package.json, Makefile, VSCode, DevPanel). State keys are now qualified by workspace folder and relative path so tasks in different locations no longer collide.
