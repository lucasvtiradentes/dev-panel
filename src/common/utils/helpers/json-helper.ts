export class JsonHelper {
  static parse<T = unknown>(text: string): T | null {
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  static parseOrThrow<T = unknown>(text: string): T {
    return JSON.parse(text) as T;
  }

  static stringify(value: unknown, indent?: number): string {
    return JSON.stringify(value, null, indent);
  }

  static stringifyPretty(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }
}
