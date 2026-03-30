---
"dev-panel": minor
---

feat: add taskScanIgnorePaths config to ignore directories when scanning for task sources

- New `taskScanIgnorePaths` option in config.jsonc to exclude directories from package.json and Makefile scanning
- Strip `$schema` line from config.jsonc when initializing workspace
