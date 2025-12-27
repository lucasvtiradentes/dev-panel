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
