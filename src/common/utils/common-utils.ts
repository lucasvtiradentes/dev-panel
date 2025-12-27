export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes === 1) return '1 min ago';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export class TypeGuards {
  static isError(value: unknown): value is Error {
    return value instanceof Error;
  }

  static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  static isNonEmptyArray<T>(value: readonly T[]): value is readonly [T, ...T[]] {
    return value.length > 0;
  }

  static getErrorMessage(error: unknown): string {
    if (TypeGuards.isError(error)) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return String(error);
  }
}
