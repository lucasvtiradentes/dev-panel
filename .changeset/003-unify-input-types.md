---
"dev-panel": major
---

feat: unify variable and task input types

BREAKING:

- Replace variable `kind` with `type`
- Rename variable `choose`, `input`, and `toggle` to `choice`, `text`, and `boolean`
- Replace task input `confirm` with `boolean`
- Replace task input `multichoice` with `choice` plus `multiSelect: true`
- Reject all legacy input definitions without fallback or backward compatibility

Variables and task inputs now share the same schema and collection runtime while retaining persistent and ephemeral lifecycles.
