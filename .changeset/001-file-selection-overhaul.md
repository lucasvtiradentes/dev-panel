---
"dev-panel": minor
---

feat: overhaul file/folder selection in inputs

- Add variable substitution in includes/excludes patterns (`$VAR_NAME`)
- Support mixed `../` depths in patterns (robust grouping)
- Inputs respect `useConfigDir` setting
- Fix keybinding to read fresh config on execution
- Remove global `settings.include`/`settings.exclude` (move patterns to each input)
