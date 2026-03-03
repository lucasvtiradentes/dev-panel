# Sync Report: docs/repo/tooling.md

**Date:** 2026-03-03T11:45:20
**Status:** UPDATED
**Changes applied:** 2

## Source files checked

- biome.json - OK, matches doc
- tsconfig.json - OK, matches doc
- esbuild.config.ts - 3 factual errors found
- package.json - scripts match doc
- .lintstagedrc.json - 1 factual error found
- knip.jsonc - OK, matches doc
- .tscanner/config.jsonc - OK, matches doc
- .husky/pre-commit - OK, matches doc

## Related docs checked

- docs/repo/local-setup.md - consistent with tooling.md
- docs/repo/cicd.md - consistent with tooling.md

## Issues found and fixed

### 1. esbuild: Minify/Sourcemap/Output settings were wrong

**Lines affected:** 70-75 (original)
**Source:** `esbuild.config.ts`

The doc claimed minify was "production only" and sourcemap was "development only", with separate output paths for production (`out/extension.js`) and development (`dist-dev/extension.js`). The actual `esbuild.config.ts` has `minify: false` and `sourcemap: false` unconditionally, with a single output path `out/extension.js`. There is no conditional build logic for dev vs production output directories.

**Fix:** Updated the table to show `false` for both Minify and Sourcemap. Replaced the two-line output section with a single output path.

### 2. lint-staged config was wrong

**Lines affected:** 93-95 (original)
**Source:** `.lintstagedrc.json`

The doc showed `"*.{ts,tsx}": ["biome check --fix"]`. The actual config has two entries: `"*.{ts,tsx,js,jsx}": ["biome check --write --no-errors-on-unmatched"]` and `"*.json": ["biome check --write --no-errors-on-unmatched"]`. Three errors: wrong glob (missing js,jsx), wrong flag (--fix vs --write --no-errors-on-unmatched), missing JSON entry.

**Fix:** Updated the lint-staged JSON block to match the actual `.lintstagedrc.json`.

## Items verified as correct (no changes needed)

- Biome settings table (version, indent, line width, quote style, semicolons, trailing)
- Biome key rules (noUnusedImports, noUnusedVariables, noExplicitAny, noStaticOnlyClass)
- Biome commands (lint, lint:fix, format)
- TypeScript settings table (target, module, strict, skipLibCheck, esModuleInterop)
- TypeScript command (typecheck)
- esbuild settings: platform, target, format, bundle, external
- Build command description
- Husky pre-commit hook structure
- Knip section (config path, description, command)
- TScanner section (config path, description)
- Schema generation section (script path, command, description)
- Package manager version (pnpm 9.15.4)
- Frontmatter sources and related_docs
