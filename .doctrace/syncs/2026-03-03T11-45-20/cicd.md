# Sync Report: docs/repo/cicd.md

**Date:** 2026-03-03
**Status:** Updated

## Relevant Changes

| Commit | File | Description |
|--------|------|-------------|
| `4674665` | `.github/actions/release-vscode/action.yml` | Added "Create and push tag" step to release action |
| `79bf0b0` | `scripts/release/check-version-bump.sh` | Added check for existing tag to prevent duplicate releases |
| `076d4ef` | `.github/workflows/callable-ci.yml` | Set `fetch-depth: 2` for version check job |
| `184b0a5` | `.github/workflows/update-docs.yml` | Added new update-docs workflow (not CI/CD related) |

## Issues Found

### 1. release-vscode action now creates version tags (FIXED)

**Source:** `.github/actions/release-vscode/action.yml` (commit `4674665`, `79bf0b0`)

The `release-vscode` composite action gained two new steps: "Get version" and "Create and push tag". After publishing to both marketplaces, it now creates and pushes a `vX.Y.Z` git tag, skipping if the tag already exists. The doc previously only listed the two marketplace publish targets.

**Fix applied:** Added "Creates and pushes a version tag (if not already present)" to the release-vscode Composite Actions section and to the Release Process diagram step 6.

## Not Changed (Reviewed and Confirmed Accurate)

- **Pipeline Overview diagram**: Correctly reflects job structure in both `prs.yml` and `push-to-main.yml`.
- **Workflow triggers**: PR triggers (`opened, synchronize, reopened`) and push-to-main trigger are correct.
- **Callable CI inputs**: `run_lint`, `run_build`, `run_test` with descriptions match source.
- **Callable CI jobs**: `check_version`, `lint`, `build` are correct. `test` job is not shown because it is optional and not used by either caller.
- **setup-and-install steps**: The listed steps (Setup Node.js, Setup pnpm, Install dependencies) are a simplified but not inaccurate summary of the actual action.
- **Secrets table**: All four secrets (`GITHUB_TOKEN`, `AZURE_VSCODE_PAT`, `OPEN_VSX_PAT`, `CLAUDE_CODE_OAUTH_TOKEN`) are used in the workflows.
- **Branch strategy and concurrency**: Both workflows use concurrency groups as described.
- **Frontmatter sources**: All four source entries remain valid references.

## Notes

- **`check_version` description**: The doc says "Detects if package.json version changed" but the script now also checks if the version tag already exists on the remote (commit `79bf0b0`). The output is `should_release` rather than just a version-changed boolean. The current description is not wrong but is an incomplete summary. Left unchanged per conservative editing rules.
- **`update-docs.yml`**: A new workflow was added (commit `184b0a5`) but it is a documentation maintenance workflow, not a CI/CD pipeline. Not added to this doc's sources or content.
