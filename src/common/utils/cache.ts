import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

export type CacheEntry<T> = {
  value: T;
  timestamp: number;
  hash?: string;
};

export class SimpleCache<T> {
  protected cache = new Map<string, CacheEntry<T>>();

  constructor(protected readonly ttlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T, hash?: string): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hash,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export class FileHashCache<T> extends SimpleCache<T> {
  getWithFileHash(key: string, filePath: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    const currentHash = getFileHash(filePath);
    if (entry.hash !== currentHash) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  setWithFileHash(key: string, value: T, filePath: string): void {
    const hash = getFileHash(filePath);
    this.set(key, value, hash);
  }
}

export function getFileHash(filePath: string): string {
  try {
    if (!fs.existsSync(filePath)) {
      return '';
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha1').update(content).digest('hex');
  } catch {
    return '';
  }
}
