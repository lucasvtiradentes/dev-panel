# Utility Organization Rule

## Rule

Utility functions MUST be organized in static classes instead of standalone functions. Do NOT export loose/standalone functions.

## Rationale

- Creates clear namespace and grouping
- Self-documenting organization
- Easier to find and maintain related functions
- Allows private helpers via `private static`
- Prevents global namespace pollution
- Better autocomplete and discoverability

## Examples

### ❌ Bad - Loose Functions

```typescript
// file-utils.ts
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

export function getExtension(path: string): string {
  return path.split('.').pop() || '';
}

export function joinPaths(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

// Usage - no namespace, unclear where functions come from
import { normalizePath, getExtension } from './file-utils';
normalizePath('/foo/bar');
```

### ✅ Good - Static Class Pattern

```typescript
// file-utils.ts
export class FileUtils {
  private static readonly SEPARATOR = '/';

  private static cleanPath(path: string): string {
    return path.replace(/\/+/g, FileUtils.SEPARATOR);
  }

  static normalizePath(path: string): string {
    return path.replace(/\\/g, FileUtils.SEPARATOR);
  }

  static getExtension(path: string): string {
    return path.split('.').pop() || '';
  }

  static joinPaths(...parts: string[]): string {
    return FileUtils.cleanPath(parts.join(FileUtils.SEPARATOR));
  }
}

// Usage - clear namespace, self-documenting
import { FileUtils } from './file-utils';
FileUtils.normalizePath('/foo/bar');
```

## When to Use Static Classes

Use static classes for:

- **Pure utility functions** (no state, no config)
- **Related helper functions** (string utils, array utils, file utils)
- **Stateless operations** (parsing, formatting, validation)
- **Math/calculation utilities**

Examples:
```typescript
export class StringUtils {
  static capitalize(str: string): string { }
  static truncate(str: string, length: number): string { }
}

export class ArrayUtils {
  static unique<T>(arr: T[]): T[] { }
  static groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> { }
}

export class ValidationUtils {
  static isEmail(str: string): boolean { }
  static isUrl(str: string): boolean { }
}
```

## When NOT to Use Static Classes

Use instance classes (services) for:

- **Stateful operations** (needs config, cache, or state)
- **Dependency injection** (needs testing, mocking)
- **Lifecycle management** (needs setup/teardown)

Examples:
```typescript
// ✅ Service with state - use instance
export class Logger {
  constructor(private namespace: string) {}
  info(message: string): void { }
}

export class CacheManager {
  private cache = new Map();
  get(key: string): unknown { }
  set(key: string, value: unknown): void { }
}

// Singleton export
export const logger = new Logger('app');
```

## File Naming

- Static utility classes: `*-utils.ts` or `*-helper.ts`
- Service classes: `*-manager.ts`, `*-service.ts`, `*-provider.ts`

## Private Helpers

Use `private static` for internal helpers:

```typescript
export class GitUtils {
  // ✅ Private helper - not exposed
  private static toGitPath(path: string): string {
    return path.replace(/\\/g, '/');
  }

  // ✅ Public API
  static getDiff(path: string): string {
    const gitPath = GitUtils.toGitPath(path);
    // ...
  }
}
```

## Migration Example

```typescript
// Before - loose functions
export function add(a: number, b: number): number {
  return a + b;
}

export function multiply(a: number, b: number): number {
  return a * b;
}

// After - static class
export class MathUtils {
  static add(a: number, b: number): number {
    return a + b;
  }

  static multiply(a: number, b: number): number {
    return a * b;
  }
}
```
