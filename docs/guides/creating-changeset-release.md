---
title:       Creating Changesets and Releases
description: How to create changesets for versioning and trigger releases
required_docs:
  - docs/repo/cicd.md: CI/CD pipeline and release process
sources:
  - .changeset/config.json: changeset configuration
  - .changeset/:            changeset files
---

# Creating Changesets and Releases

## Overview

This project uses [Changesets](https://github.com/changesets/changesets) for version management. Changesets track changes and automate version bumps and changelog generation.

## Creating a Changeset

### File Location

Create changeset files in `.changeset/` directory:

```
.changeset/
├── config.json
├── README.md
└── 001-your-change.md   # <-- your changeset
```

### File Format

```md
---
"dev-panel": patch
---

fix: description of your fix
```

### Version Types

| Type  | When to use                        | Example                     |
|-------|------------------------------------|-----------------------------|
| patch | Bug fixes, minor improvements      | Fix typo, fix edge case     |
| minor | New features, non-breaking changes | Add new command, new option |
| major | Breaking changes                   | Remove feature, change API  |

### Naming Convention

```
NNN-short-description.md
```

Examples:
- `001-fix-keybinding-refresh.md`
- `002-add-variable-substitution.md`

## Multiple Changesets

You can create multiple changesets per PR to separate concerns:

```
.changeset/
├── 001-feature-x.md     (minor)
├── 002-bugfix-y.md      (patch)
└── 003-breaking-z.md    (major)
```

The highest version type wins: if any changeset is `major`, the release is major.

## Release Flow

```
1. Create changeset file(s)
   │
   v
2. Commit and push to branch
   │
   v
3. Create PR to main
   │
   v
4. Merge PR
   │
   v
5. Changesets Action creates "Version Packages" PR
   ├── Bumps version in package.json
   ├── Updates CHANGELOG.md
   └── Removes consumed changeset files
   │
   v
6. Merge "Version Packages" PR
   │
   v
7. CI detects version bump and publishes
   ├── VSCode Marketplace
   └── Open VSX Registry
```

## Best Practices

- One changeset per logical change
- Use clear, conventional commit-style descriptions
- Include BREAKING note for breaking changes:

```md
---
"dev-panel": major
---

feat: remove settings.include/exclude from config (BREAKING)

Users must move patterns to individual inputs.
```

## Common Scenarios

### Bug Fix

```md
---
"dev-panel": patch
---

fix: prevent crash when config file is empty
```

### New Feature

```md
---
"dev-panel": minor
---

feat: add variable substitution in glob patterns
```

### Breaking Change

```md
---
"dev-panel": major
---

feat: rename `useConfigDir` to `relativeTo` (BREAKING)
```

### Multiple Changes in One

```md
---
"dev-panel": minor
---

feat: overhaul file selection

- Add variable substitution in patterns
- Support `../` in includes patterns
- Simplify defaults (BREAKING: removes global settings)
```
