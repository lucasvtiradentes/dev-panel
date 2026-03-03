---
title:       Coding Rules
description: Code conventions and patterns used in the codebase
related_docs:
  - docs/architecture.md:   system design context
  - docs/repo/structure.md: file organization
sources:
  - src/common/utils/helpers/: helper class examples
  - src/common/schemas/:       Zod schema usage
  - src/views/:                TreeItem patterns
---

# Coding Rules

## Utility Organization

### Static Helper Classes

Group related utility functions in static classes, not loose exports:

```typescript
// Correct
export class GroupHelper {
  static groupItems<T>(items: T[]): Map<string, T[]> { ... }
  static sortGroups(groups: Map<string, unknown>): void { ... }
}

// Incorrect - avoid loose functions
export function groupItems<T>(items: T[]): Map<string, T[]> { ... }
export function sortGroups(groups: Map<string, unknown>): void { ... }
```

Benefits:
- Clear namespace for related functions
- Easier discoverability
- Consistent import patterns

### Domain Organization

Helpers are organized by domain:

```
src/common/utils/helpers/
├── group-helper.ts      # Grouping utilities
├── json-helper.ts       # JSON operations
├── keybindings-helper.ts
├── node-helper.ts       # Node.js APIs
├── package-json-helper.ts
├── type-guards-helper.ts
└── variables-helper.ts
```

## Function Parameters

### Options Object Pattern

Functions with 3+ parameters should use options object:

```typescript
// Correct
type ExecuteTaskOptions = {
  task: DevPanelTask;
  cwd: string;
  env: Record<string, string>;
};

async function executeTask(options: ExecuteTaskOptions) {
  const { task, cwd, env } = options;
  ...
}

// Incorrect - too many positional params
async function executeTask(
  task: DevPanelTask,
  cwd: string,
  env: Record<string, string>
) { ... }
```

Benefits:
- Named parameters at call site
- Easy to add optional parameters
- No positional confusion

## Schema Validation

### Zod Schemas

All config parsing uses Zod for validation:

```typescript
import { z } from 'zod';

export const DevPanelTaskSchema = z.object({
  name: z.string(),
  command: z.string(),
  group: z.string().optional(),
  hideTerminal: z.boolean().optional(),
});

export type DevPanelTask = z.infer<typeof DevPanelTaskSchema>;
```

Schema file: `src/common/schemas/config-schema.ts`

### Parsing Pattern

```typescript
const rawConfig = readJsoncFile(content);
const config = DevPanelConfigSchema.parse(rawConfig);
```

## Tree View Items

### Base Types

```typescript
// Named items with group support
class NamedTreeItem extends TreeItemClass {
  constructor(
    public readonly name: string,
    public readonly group?: string
  ) {
    super(name, TreeItemCollapsibleState.None);
  }
}

// Group container
class GroupTreeItem extends TreeItemClass {
  constructor(
    public readonly groupName: string,
    public readonly children: NamedTreeItem[]
  ) {
    super(groupName, TreeItemCollapsibleState.Expanded);
  }
}
```

### Context Values

Use CONTEXT_VALUES constants for context menu control:

```typescript
this.contextValue = CONTEXT_VALUES.VARIABLE_ITEM;
```

## State Management

### StateManager Interface

```typescript
type StateManager<TSource> = {
  getOrder(source: TSource, grouped: boolean): string[];
  saveOrder(source: TSource, grouped: boolean, order: string[]): void;
};
```

Used by drag-and-drop controller for consistent ordering.

## Anti-Patterns to Avoid

### Loose Exported Functions

```typescript
// Avoid
export function parseConfig() { ... }
export function saveConfig() { ... }

// Prefer
export class ConfigManager {
  static parseConfig() { ... }
  static saveConfig() { ... }
}
```

### Mixed Parameter Approaches

```typescript
// Avoid mixing styles
function createTask(name: string, options: TaskOptions) { ... }

// Prefer all in options
function createTask(options: CreateTaskOptions) { ... }
```

### Direct VSCode API Calls

```typescript
// Avoid direct imports
import * as vscode from 'vscode';
vscode.window.showInformationMessage(...);

// Prefer wrapper
import { VscodeHelper } from '../common/vscode/vscode-helper';
VscodeHelper.showToastMessage(ToastKind.Info, ...);
```

Benefits:
- Centralized API surface
- Easier mocking for tests
- Consistent error handling

## Naming Conventions

| Type           | Convention  | Example             |
|----------------|-------------|---------------------|
| Classes        | PascalCase  | ConfigManager       |
| Static methods | camelCase   | parseConfig         |
| Constants      | UPPER_SNAKE | CONFIG_DIR_NAME     |
| Types          | PascalCase  | DevPanelConfig      |
| Files          | kebab-case  | config-manager.ts   |
| Enums          | PascalCase  | TaskSource          |
| Enum values    | PascalCase  | TaskSource.DevPanel |
