---
"dev-panel": major
---

feat: standardize commands, config, and paths on the workspace root

BREAKING:

- Remove `useConfigDir`; tasks and variable commands always run from the owning workspace root
- Fix Dev Panel config location to `<workspace>/.devpanel`
- Remove custom config-location state and behavior
- Reject legacy task fields instead of providing fallback or backward compatibility

Prefix config-local scripts with `.devpanel/`.
