---
"dev-panel": patch
---

fix: pick default task source based on what the repo actually has

When opening a repo without a `.devpanel` folder, the tasks view defaulted to the DevPanel source even when the repo already had `package.json`, `Makefile`, or `.vscode/tasks.json`. It now resolves the initial source through an availability-aware priority (Package → Makefile → VSCode → DevPanel), with DevPanel as a last resort. The same priority is used when a previously selected source becomes unavailable, replacing the hardcoded DevPanel fallback.
