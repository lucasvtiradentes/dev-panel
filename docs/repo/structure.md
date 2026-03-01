---
title:       Repository Structure
description: Directory layout and file organization
related_docs:
  - docs/repo/tooling.md:      build tools and linting
  - docs/repo/local-setup.md:  development workflow
sources:
  - src/:     extension source code
  - scripts/: build and release scripts
  - .github/: CI/CD workflows
---

# Repository Structure

```
dev-panel/
├── src/                          # Extension source code
│   ├── extension.ts              # Entry point, activate/deactivate
│   ├── commands/                 # Command handlers
│   │   ├── register-all.ts       # Central command registration
│   │   ├── internal/             # Internal commands (not in palette)
│   │   │   ├── excludes/         # Exclude management commands
│   │   │   ├── replacements/     # Replacement toggle commands
│   │   │   ├── tasks/            # Task execution commands
│   │   │   └── variables/        # Variable selection commands
│   │   └── public/               # Palette-visible commands
│   ├── views/                    # Tree view providers
│   │   ├── _view_base/           # Shared view utilities
│   │   ├── excludes/             # Git excludes view
│   │   ├── replacements/         # File replacements view
│   │   ├── tasks/                # Task runner view
│   │   └── variables/            # Variables view
│   ├── common/                   # Shared utilities
│   │   ├── constants/            # Extension constants
│   │   ├── core/                 # Core managers
│   │   ├── lib/                  # External integrations (git, logger)
│   │   ├── schemas/              # Zod schemas
│   │   ├── state/                # State management
│   │   ├── utils/                # Helper utilities
│   │   └── vscode/               # VSCode API wrappers
│   ├── watchers/                 # File system watchers
│   └── status-bar/               # Status bar management
│
├── .github/                      # GitHub configuration
│   ├── actions/                  # Reusable composite actions
│   │   ├── setup-and-install/    # Node + pnpm setup
│   │   └── release-vscode/       # Marketplace publish
│   └── workflows/                # CI/CD pipelines
│       ├── prs.yml               # PR validation
│       ├── push-to-main.yml      # Main branch CI + release
│       └── callable-ci.yml       # Reusable CI workflow
│
├── scripts/                      # Build and utility scripts
│   ├── generate-schema.ts        # Generate JSON schema from Zod
│   ├── install-local/            # Dev extension installer
│   ├── release/                  # Release automation
│   └── helpers/                  # Script utilities
│
├── resources/                    # Static assets
│   ├── icon.svg                  # Extension icon (sidebar)
│   ├── icon-colored.png          # Extension icon (marketplace)
│   ├── schema.json               # Generated config schema
│   └── templates/                # Config templates
│
├── out/                          # Production build output
│   └── extension.js              # Bundled extension
│
├── dist-dev/                     # Development build output
│   └── extension.js              # Dev build with sourcemaps
│
├── .devpanel/                    # Local extension config
│   └── config.jsonc              # Development configuration
│
├── .changeset/                   # Changeset files for releases
│
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
├── biome.json                    # Linter/formatter config
├── esbuild.config.ts             # Build configuration
└── knip.jsonc                    # Unused code detection
```

## Source Organization

### Commands (`src/commands/`)

```
commands/
├── register-all.ts      # Registers 30+ commands
├── internal/            # Hidden from command palette
│   ├── execute-task.ts  # Task execution with inputs
│   ├── select-config-option.ts
│   ├── excludes/
│   ├── replacements/
│   ├── tasks/
│   └── variables/
└── public/              # Visible in command palette
    ├── show-logs.ts
    ├── show-workspace-state.ts
    └── clear-workspace-state.ts
```

### Views (`src/views/`)

```
views/
├── _view_base/          # Shared base classes
│   ├── base-items.ts    # GroupTreeItem, NamedTreeItem
│   ├── base-dnd-controller.ts
│   ├── base-keybindings.ts
│   └── types.ts
├── tasks/
│   ├── provider.ts      # TaskTreeDataProvider
│   ├── items.ts         # TreeTask, GroupTreeItem
│   ├── state.ts         # Task state management
│   ├── devpanel-tasks.ts
│   ├── vscode-tasks.ts
│   ├── package-json.ts
│   ├── task-executor.ts
│   └── keybindings-local.ts
├── variables/
│   ├── variables-provider.ts
│   ├── state.ts
│   └── keybindings-local.ts
├── replacements/
│   ├── replacements-provider.ts
│   ├── file-ops.ts      # File/patch operations
│   ├── state.ts
│   └── keybindings-local.ts
└── excludes/
    ├── excludes-provider.ts
    └── file-ops.ts      # .git/info/exclude operations
```

### Common (`src/common/`)

```
common/
├── constants/           # Extension-wide constants
│   ├── constants.ts     # General constants
│   ├── enums.ts         # Type enums
│   ├── context-keys.ts  # VSCode context keys
│   └── scripts-constants.ts
├── core/
│   ├── config-manager.ts
│   ├── extension-store.ts
│   ├── keybindings-sync.ts
│   └── tree-item-utils.ts
├── lib/
│   ├── git.ts           # Git operations wrapper
│   └── logger.ts        # File-based logging
├── schemas/
│   ├── config-schema.ts # Zod schema definitions
│   ├── types.ts         # Derived types
│   └── shared-state.schema.ts
├── state/
│   ├── base.ts          # State base class
│   ├── workspace.ts     # Workspace state
│   └── index.ts
├── utils/
│   ├── functions/       # Utility functions
│   └── helpers/         # Helper classes
└── vscode/
    ├── vscode-helper.ts # VSCode API facade
    ├── vscode-commands.ts
    ├── vscode-context.ts
    ├── vscode-inputs.ts
    └── vscode-types.ts
```
