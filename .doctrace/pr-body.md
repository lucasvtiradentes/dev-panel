## Summary

8 docs updated since `docs-base`, all high confidence.

```
 docs/architecture.md               | 14 ++++++++----
 docs/features/git-excludes.md      |  2 +-
 docs/features/replacements-view.md | 45 ++++++++++++++++++--------------
 docs/repo/cicd.md                  |  4 +++-
 docs/repo/local-setup.md           |  2 +-
 docs/repo/structure.md             |  5 +++--
 docs/repo/tooling.md               | 11 +++++-----
 docs/rules.md                      |  4 ++--
 8 files changed, 54 insertions(+), 33 deletions(-)
```

<div align="center">

| Doc | Changes | Metadata |
|-----|---------|----------|
| `docs/features/git-excludes.md` | 1 fix (auto-create requirement) | - |
| `docs/overview.md` | No changes | - |
| `docs/architecture.md` | 2 fixes (activation flow, keybindings watcher) | - |
| `docs/features/replacements-view.md` | 4 fixes (flow diagrams, preview diff) | +1 source |
| `docs/features/task-runner.md` | No changes | - |
| `docs/features/variables-manager.md` | No changes | - |
| `docs/repo/cicd.md` | 2 fixes (version tag step) | - |
| `docs/repo/local-setup.md` | 1 fix (esbuild output dir) | - |
| `docs/repo/structure.md` | 2 fixes (resources dir, workflow file) | - |
| `docs/repo/tooling.md` | 2 fixes (esbuild config, lint-staged) | - |
| `docs/rules.md` | 1 fix (StateManager param name) | - |

</div>

## Source

<details>
<summary>48 commits in range</summary>

**Range**: `f513f06..ccd58c9`

<div align="center">

| Hash | Author | Message |
|------|--------|---------|
| ccd58c9 | Lucas Vieira | chore: aligned docs |
| 184b0a5 | Lucas Vieira | chore: add update docs action |
| b158e99 | Lucas Vieira | Merge branch 'chore/update_docs' |
| cc20a63 | Lucas Vieira | chore: add new docs |
| 2e2f98e | Lucas Vieira | chore: remove old docs |
| dadee44 | Lucas Vieira | Merge pull request #31 from lucasvtiradentes/changeset-release/main |
| 0c94fa3 | github-actions[bot] | Version Packages |
| 076d4ef | Lucas Vieira | fix: fetch-depth 2 for version check |
| 79bf0b0 | Lucas Vieira | fix: prevent duplicate release when tag exists |
| 0b821cc | Lucas Vieira | docs: shorten task runner description |
| 49b8b70 | Lucas Vieira | Merge pull request #30 from lucasvtiradentes/changeset-release/main |
| 9aec18c | github-actions[bot] | Version Packages |
| ea27030 | Lucas Vieira | Merge branch 'chore/small_refactors_v2' |
| a1a6bb7 | Lucas Vieira | chore: update demo image |
| 8a77728 | Lucas Vieira | refactor: remove (not set) label from variables |
| 52c4b88 | Lucas Vieira | docs: update README with current features |
| c48a168 | Lucas Vieira | feat: add excludes watcher |
| d755c0c | Lucas Vieira | fix: preview diff supports new file creation |
| 9137b10 | Lucas Vieira | chore: remove old plugins |
| 0d52728 | Lucas Vieira | fix: allow running multiple VSCode tasks from same group |
| 1b9e859 | Lucas Vieira | refactor: standardize excludes provider API |
| b744954 | Lucas Vieira | feat: add preview diff button for replacements |
| 8dcd1e9 | Lucas Vieira | fix: go-to-task opens correct file for vscode tasks |
| 7d19e3d | Lucas Vieira | chore: remove unused global tasks functionality |
| 7253cce | Lucas Vieira | Merge pull request #29 from lucasvtiradentes/changeset-release/main |
| c1035e4 | github-actions[bot] | Version Packages |
| 099c529 | Lucas Vieira | Merge branch 'fix/run_task_issue' |
| 4674665 | Lucas Vieira | chore: create version tag on release workflow |
| 2167668 | Lucas Vieira | fix: tasks run from workspace root by default |
| fba27ce | Lucas Vieira | chore: update bctx install |
| f63c7e7 | Lucas Vieira | chore: add bctx templates for chore and fix branches |
| 300e508 | Lucas Vieira | Merge pull request #28 from lucasvtiradentes/changeset-release/main |
| a91a0f5 | github-actions[bot] | Version Packages |
| 863784a | Lucas Vieira | Merge branch 'chore/small_refactors' |
| 9ff2d54 | Lucas Vieira | fix: preserve user when clauses when scoping keybindings |
| 2cb0902 | Lucas Vieira | chore: remove dead code and unused exports |
| 99f0472 | Lucas Vieira | feat: workspace-scoped keybindings with toast prompt |
| e02030a | Lucas Vieira | refactor: unify toggle favorite/hide with context-aware labels |
| 0e04305 | Lucas Vieira | chore: remove copy task to global/workspace commands and dead code |
| 8bf3dbc | Lucas Vieira | fix: keybindings filter not working when opening from view |
| 022a8f6 | Lucas Vieira | Merge branch 'feature/add_local_view' |
| ec2b55e | Lucas Vieira | feat: add Excludes view to manage .git/info/exclude |
| f24b671 | Lucas Vieira | Merge pull request #27 from lucasvtiradentes/changeset-release/main |
| be1cfdb | github-actions[bot] | Version Packages |
| 4c33ae0 | Lucas Vieira | feat: add configurable tasks view location |
| fd772b5 | Lucas Vieira | Merge pull request #26 from lucasvtiradentes/changeset-release/main |
| d780856 | github-actions[bot] | Version Packages |
| 68d4a57 | Lucas Vieira | Merge branch 'feature/general_improvements' |
| b036649 | Lucas Vieira | chore: add changeset for tools/prompts removal |
| 09c9424 | Lucas Vieira | chore: update bctx configs |
| 0828fce | Lucas Vieira | chore: cleanup stale refs to tools/prompts/registry |
| 4978607 | Lucas Vieira | refactor: remove prompts feature |
| 193c2c2 | Lucas Vieira | refactor: remove tools feature |

</div>

**Related PRs**: [#26](https://github.com/lucasvtiradentes/dev-panel/pull/26), [#27](https://github.com/lucasvtiradentes/dev-panel/pull/27), [#28](https://github.com/lucasvtiradentes/dev-panel/pull/28), [#29](https://github.com/lucasvtiradentes/dev-panel/pull/29), [#30](https://github.com/lucasvtiradentes/dev-panel/pull/30), [#31](https://github.com/lucasvtiradentes/dev-panel/pull/31)

</details>

## What Changed

**Key themes**: Docs updated to reflect removal of tools/prompts features, addition of the Excludes view, and corrections to build config, CI/CD pipeline, and replacement preview diff flow diagrams.

<details>
<summary>Changes by doc (11 docs)</summary>

### docs/features/git-excludes.md
- Fixed requirement: `.git/info/exclude` is auto-created, not a prerequisite (source: `src/views/excludes/file-ops.ts`)

### docs/overview.md
- No changes needed (doc is up to date)

### docs/repo/cicd.md
- Added version tag creation step to release-vscode action (source: `.github/actions/release-vscode/action.yml`)
- Added tag step to release process diagram

### docs/repo/structure.md
- Fixed `resources/templates/` -> `resources/init/` (actual directory name)
- Added missing `update-docs.yml` workflow file

### docs/repo/tooling.md
- Fixed esbuild config: minify/sourcemap are unconditionally false, single output path (source: `esbuild.config.ts`)
- Fixed lint-staged config: correct file globs and command flags (source: `.lintstagedrc.json`)

### docs/rules.md
- Fixed `grouped` -> `isGrouped` parameter name in StateManager interface (source: `src/views/_view_base/types.ts`)

### docs/architecture.md
- Added 2 missing activation steps: `setupDisposables` and `setupConfigChangeListener` (source: `src/extension.ts`)
- Fixed KeybindingsWatcher: watches global user keybindings.json, not workspace (source: `src/watchers/keybindings-watcher.ts`)

### docs/repo/local-setup.md
- Fixed esbuild output directory: `out/` not `dist-dev/` (source: `esbuild.config.ts`)

### docs/features/replacements-view.md
- Added missing source to frontmatter: `preview-replacement-diff.ts`
- Fixed activation flow: skip-worktree is conditional on file existing in git
- Fixed deactivation flow: added new file deletion path
- Fixed preview diff description: side labels depend on active state

### docs/features/task-runner.md
- No changes needed (doc is up to date)

### docs/features/variables-manager.md
- No changes needed (doc is up to date)

</details>

## Validation

- Circular deps: none
- Broken refs: none

## Documentation Gaps

<details>
<summary>23 changes analyzed, 2 need attention</summary>

<div align="center">

| # | Impact | Change | Status | Notes |
|---|--------|--------|--------|-------|
| 1 | feature | Excludes view | covered | `docs/features/git-excludes.md` |
| 2 | feature | Preview diff for replacements | covered | `docs/features/replacements-view.md` |
| 3 | feature | Configurable tasks view location | partial | Not in `docs/features/task-runner.md` |
| 4 | feature | Workspace-scoped keybindings | partial | Architecture updated, not in feature docs |
| 5 | feature | Excludes watcher | covered | `docs/features/git-excludes.md` |
| 6 | refactor | Remove tools feature | covered | Refs removed from affected docs |
| 7 | refactor | Remove prompts feature | covered | Refs removed from affected docs |
| 8 | fix | Tasks run from workspace root | covered | Already accurate |
| 9 | fix | Prevent duplicate release tag | covered | `docs/repo/cicd.md` |
| 10 | fix | Preview diff new file creation | covered | `docs/features/replacements-view.md` |
| 11 | minor | Update demo image | no-doc | Visual asset |
| 12 | minor | Version packages (3x) | no-doc | Automated releases |
| 13 | minor | bctx configs | no-doc | Tooling config |
| 14 | minor | Add update-docs workflow | covered | `docs/repo/structure.md` |

</div>

**Legend:** missing (needs new doc), partial (needs update), covered (done), no-doc (not needed)

</details>

## Action Needed

<div align="center">

| # | Change | Suggested Action |
|---|--------|------------------|
| 3 | Configurable tasks view location | Add section to `docs/features/task-runner.md` |
| 4 | Workspace-scoped keybindings | Consider adding to feature docs or architecture |

</div>
