import JSON5 from 'json5';

export function readJsoncFile<T = Record<string, unknown>>(content: string) {
  try {
    return JSON5.parse(content) as T;
  } catch {
    return null;
  }
}
