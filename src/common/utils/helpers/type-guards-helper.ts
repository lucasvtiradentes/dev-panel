export class TypeGuardsHelper {
  static isError(value: unknown): value is Error {
    return value instanceof Error;
  }

  static isString(value: unknown): value is string {
    return typeof value === 'string';
  }

  static isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
  }

  static isNumber(value: unknown): value is number {
    return typeof value === 'number';
  }

  static isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  static isObjectWithProperty<K extends string>(value: unknown, key: K): value is Record<K, unknown> {
    return TypeGuardsHelper.isObject(value) && key in value;
  }

  static isNonEmptyArray<T>(value: readonly T[]): value is readonly [T, ...T[]] {
    return value.length > 0;
  }

  static isEmptyString(value: string): boolean {
    return value.trim() === '';
  }

  static isNonEmptyString(value: string): boolean {
    return value.trim() !== '';
  }

  static isEmpty(value: string): boolean {
    return value === '';
  }

  static isObjectLike(value: unknown): value is object {
    return typeof value === 'object';
  }

  static getErrorMessage(error: unknown): string {
    if (TypeGuardsHelper.isError(error)) {
      return error.message;
    }
    if (TypeGuardsHelper.isString(error)) {
      return error;
    }
    return String(error);
  }

  static getTreeItemLabel(item: { label?: string | { label?: string } }): string {
    return TypeGuardsHelper.isString(item.label) ? item.label : (item.label?.label ?? '');
  }
}
