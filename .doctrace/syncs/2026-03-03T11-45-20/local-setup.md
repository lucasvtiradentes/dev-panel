# Sync Report: docs/repo/local-setup.md

**Date:** 2026-03-03
**Status:** Updated
**Changes:** 1

## Sources Checked

- `package.json` — scripts, engines, config schema
- `scripts/install-local/install-local-vscode.ts` — dev extension installer
- `esbuild.config.ts` — bundler config (outfile)
- `src/common/constants/scripts-constants.ts` — extension ID, log filename
- `src/common/constants/functions.ts` — runtime helpers
- `src/common/lib/logger.ts` — log file path
- `src/common/schemas/config-schema.ts` — config shape
- `docs/repo/tooling.md` — required doc
- `docs/repo/structure.md` — related doc

## Issues Found

### 1. Incorrect esbuild output directory (FIXED)

- **Line:** 39
- **Was:** `1. esbuild bundling to \`dist-dev/\``
- **Now:** `1. esbuild bundling to \`out/\``
- **Reason:** `esbuild.config.ts` sets `outfile: 'out/extension.js'`. The `dist-dev/` directory is a staging area used by `install-local-vscode.ts` to assemble the dev extension copy, not the esbuild output target.

## Verified Accurate (no changes needed)

- **Prerequisites:** Node 18+, pnpm 9.15+, VSCode 1.93+ all match `package.json` (`engines.vscode: ^1.93.0`, `packageManager: pnpm@9.15.4`, `target: node18`)
- **Build steps 2 and 3:** Schema generation and local install script match `postbuild` script
- **Dev extension location:** `$HOME/.vscode/extensions/lucasvtiradentes.dev-panel-dev/` matches `buildExtensionId(true)` output
- **Log file path:** `/tmp/dev-panel-dev.log` matches `buildLogFilename(true)` with `tmpdir()` base
- **"Dev Panel: Show Logs" command:** Matches `devPanel.showLogs` command title in `package.json`
- **Available Scripts table:** All 8 scripts match current `package.json` scripts exactly
- **Configuration example:** Top-level keys `variables`, `tasks`, `replacements` match `DevPanelConfigSchema`
- **Frontmatter sources:** Still accurate
- **Required/related docs:** Still accurate and exist
