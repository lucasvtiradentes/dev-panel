---
title:       Local Setup
description: Development environment setup and workflow
required_docs:
  - docs/repo/tooling.md:    build tools used
related_docs:
  - docs/repo/structure.md:  project organization
sources:
  - package.json:           npm scripts
  - scripts/install-local/: dev installer
---

# Local Setup

## Prerequisites

- Node.js 18+
- pnpm 9.15+
- VSCode 1.93+

## Installation

```bash
git clone https://github.com/lucasvtiradentes/dev-panel
cd dev-panel
pnpm install
pnpm run build
```

## Development Build

The build command installs a development version of the extension:

```bash
pnpm run build
```

This runs:
1. esbuild bundling to `dist-dev/`
2. Schema generation to `resources/schema.json`
3. Local installation script

## Dev Extension Location

```
$HOME/.vscode/extensions/lucasvtiradentes.dev-panel-dev/
```

The dev extension runs alongside the production version with a separate ID.

## Logs

Development logs are written to:

```
/tmp/dev-panel-dev.log
```

View logs:
- Command Palette: "Dev Panel: Show Logs"
- Or open file directly

## Available Scripts

| Script      | Description                          |
|-------------|--------------------------------------|
| `build`     | Bundle + schema + install local      |
| `typecheck` | TypeScript type checking             |
| `lint`      | Run Biome linter                     |
| `lint:fix`  | Auto-fix lint issues                 |
| `format`    | Format code with Biome               |
| `clean`     | Remove out/, dist-dev/, node_modules |
| `schema`    | Generate JSON schema only            |
| `knip`      | Check for unused code                |

## Development Workflow

1. Make changes in `src/`
2. Run `pnpm run build`
3. Reload VSCode window (Cmd+Shift+P -> "Developer: Reload Window")
4. Test changes
5. Check logs in `/tmp/dev-panel-dev.log`

## Quality Checks

Before committing:

```bash
pnpm run format      # Format code
pnpm run lint        # Check lint
pnpm run typecheck   # Type check
pnpm run build       # Build and test
```

## Debugging

1. Open VSCode in the project directory
2. Press F5 to launch Extension Development Host
3. Set breakpoints in `src/` files
4. Check Debug Console for output

## Configuration for Testing

Create `.devpanel/config.jsonc` in your test workspace:

```jsonc
{
  "$schema": "./resources/schema.json",
  "variables": [],
  "tasks": [],
  "replacements": []
}
```
