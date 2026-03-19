---
"dev-panel": minor
---

feat: dynamic task source availability

- Task sources (VSCode, npm, Makefile) only show if their files exist
- Switch button cycles only through available sources
- Falls back to DevPanel if current source file is deleted
- File watcher auto-refreshes on tasks.json, package.json, and Makefile changes
