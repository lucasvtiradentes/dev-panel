---
"dev-panel": patch
---

fix: improve task view source, grouping, and scan-ignore controls

- Show the active task source as the view description
- Make grouped/flat mode work with multiple package.json and Makefile locations
- Preserve location order and prefix flat task labels with their source path
- Show scan-ignore controls only for recursive npm and Makefile sources
- Hide built-in scan ignores from the management menu
