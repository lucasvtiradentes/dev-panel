---
title:       CI/CD
description: Continuous integration and deployment pipelines
related_docs:
  - docs/repo/tooling.md:     build tools
  - docs/repo/local-setup.md: local development
sources:
  - .github/workflows/prs.yml:          PR validation
  - .github/workflows/push-to-main.yml: main branch + release
  - .github/workflows/callable-ci.yml:  reusable CI
  - .github/actions/:                   composite actions
---

# CI/CD

## Pipeline Overview

```
┌───────────────────────────────────────────────────────────────┐
│                    Pull Request                               │
└───────────────────────────────────────────────────────────────┘
                           │
                           v
┌───────────────────────────────────────────────────────────────┐
│ prs.yml                                                       │
│ ├── ci (callable-ci.yml)                                      │
│ │   ├── check_version                                         │
│ │   ├── lint                                                  │
│ │   └── build                                                 │
│ └── tscanner_pr_check (AI code review)                        │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                   Push to main                                │
└───────────────────────────────────────────────────────────────┘
                           │
                           v
┌───────────────────────────────────────────────────────────────┐
│ push-to-main.yml                                              │
│ ├── ci (callable-ci.yml)                                      │
│ ├── release (changesets)                                      │
│ └── publish_vscode (if version bumped)                        │
└───────────────────────────────────────────────────────────────┘
```

## Workflows

### PR Validation (`prs.yml`)

Triggered on: `pull_request` (opened, synchronize, reopened)

Jobs:
1. CI - lint, build, typecheck
2. TScanner PR Check - AI-powered code review

### Main Branch (`push-to-main.yml`)

Triggered on: `push` to `main`

Jobs:
1. CI - lint, build, typecheck
2. Release - Creates version PR via changesets
3. Publish - Deploys to marketplaces (if version bumped)

### Callable CI (`callable-ci.yml`)

Reusable workflow with inputs:
- `run_lint`  - Run lint checks
- `run_build` - Run build
- `run_test`  - Run tests (optional)

Jobs:
- `check_version` - Detects if package.json version changed
- `lint`          - Biome check + format verification
- `build`         - TypeScript + esbuild

## Composite Actions

### setup-and-install

Location: `.github/actions/setup-and-install/`

Steps:
1. Setup Node.js
2. Setup pnpm
3. Install dependencies

### release-vscode

Location: `.github/actions/release-vscode/`

Publishes to:
- VSCode Marketplace (via Azure PAT)
- Open VSX Registry (via Open VSX PAT)
- Creates and pushes a version tag (if not already present)

## Secrets Required

| Secret                  | Purpose                    |
|-------------------------|----------------------------|
| GITHUB_TOKEN            | PR creation, releases      |
| AZURE_VSCODE_PAT        | VSCode Marketplace publish |
| OPEN_VSX_PAT            | Open VSX publish           |
| CLAUDE_CODE_OAUTH_TOKEN | TScanner AI analysis       |

## Release Process

```
1. Create changeset file in .changeset/
   │
   v
2. Push to main
   │
   v
3. Changesets Action creates "Version Packages" PR
   │
   v
4. Merge Version PR
   │
   v
5. CI detects version bump (check_version job)
   │
   v
6. publish_vscode job runs
   │
   ├── Package extension
   ├── Publish to VSCode Marketplace
   ├── Publish to Open VSX
   └── Create version tag (if not already present)
```

## Branch Strategy

| Branch  | Purpose                          |
|---------|----------------------------------|
| main    | Production, triggers releases    |
| feature | Development, creates PRs to main |

Concurrency groups prevent parallel runs of the same workflow.
