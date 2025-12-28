import { generateHashForFileContent } from '../utils/functions/generate-cache-key';
import { FileIOHelper } from '../utils/helpers/node-helper';

type CacheEntry<T> = {
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

  set(key: string, value: T, hash?: string) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      hash,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

export class FileHashCache<T> extends SimpleCache<T> {
  getFileHash(filePath: string): string {
    try {
      if (!FileIOHelper.fileExists(filePath)) {
        return '';
      }
      const content = FileIOHelper.readFile(filePath);
      return generateHashForFileContent(content);
    } catch {
      return '';
    }
  }

  getWithFileHash(key: string, filePath: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    const currentHash = this.getFileHash(filePath);
    if (entry.hash !== currentHash) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  setWithFileHash(key: string, value: T, filePath: string) {
    const hash = this.getFileHash(filePath);
    this.set(key, value, hash);
  }
}
