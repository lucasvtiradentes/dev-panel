---
title:       Tooling
description: Build tools, linting, and code quality configuration
related_docs:
  - docs/repo/local-setup.md:  development workflow
  - docs/repo/cicd.md:         CI pipeline usage
sources:
  - biome.json:        linter/formatter config
  - tsconfig.json:     TypeScript config
  - esbuild.config.ts: bundler config
  - package.json:      scripts and dependencies
---

# Tooling

## Biome (Linter + Formatter)

Configuration: `biome.json`

| Setting     | Value     |
|-------------|-----------|
| Version     | 1.9.4     |
| Indent      | 2 spaces  |
| Line Width  | 120 chars |
| Quote Style | single    |
| Semicolons  | always    |
| Trailing    | all       |

Key rules:
- noUnusedImports:   error
- noUnusedVariables: warn
- noExplicitAny:     off (allows `any`)
- noStaticOnlyClass: off (allows static utility classes)

Commands:
```bash
pnpm run lint        # Check for issues
pnpm run lint:fix    # Auto-fix issues
pnpm run format      # Format code
```

## TypeScript

Configuration: `tsconfig.json`

| Setting           | Value    |
|-------------------|----------|
| Target            | ES2024   |
| Module            | commonjs |
| Strict            | true     |
| Skip Lib Check    | true     |
| ES Module Interop | true     |

Command:
```bash
pnpm run typecheck   # Type checking only
```

## esbuild (Bundler)

Configuration: `esbuild.config.ts`

| Setting   | Value            |
|-----------|------------------|
| Platform  | node             |
| Target    | node18           |
| Format    | cjs              |
| Bundle    | true             |
| External  | vscode           |
| Minify    | production only  |
| Sourcemap | development only |

Output:
- Production:  `out/extension.js`
- Development: `dist-dev/extension.js`

Command:
```bash
pnpm run build       # Build + install local
```

## Husky + lint-staged

Pre-commit hooks configured in `.husky/`:

```
.husky/
└── pre-commit      # Runs lint-staged
```

lint-staged config (`.lintstagedrc.json`):
```json
{
  "*.{ts,tsx}": ["biome check --fix"]
}
```

## Knip (Dead Code Detection)

Configuration: `knip.jsonc`

Detects:
- Unused exports
- Unused dependencies
- Unused files

Command:
```bash
pnpm run knip
```

## TScanner (AI Code Analysis)

Configuration: `.tscanner/config.jsonc`

Used in CI for PR code review with Claude AI analysis.

## Schema Generation

Script: `scripts/generate-schema.ts`

Generates JSON Schema from Zod definitions for config validation:
```bash
pnpm run schema      # Generate resources/schema.json
```

The schema enables IntelliSense in `.devpanel/config.jsonc` files.

## Package Manager

| Tool | Version |
|------|---------|
| pnpm | 9.15.4  |

Lock file: `pnpm-lock.yaml`
