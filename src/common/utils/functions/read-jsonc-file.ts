import JSON5 from 'json5';

export function readJsoncFile(content: string): Record<string, unknown> | null {
  try {
    return JSON5.parse(content) as Record<string, unknown>;
  } catch {
    return null;
  }
}
