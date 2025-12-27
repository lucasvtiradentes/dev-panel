import * as path from 'node:path';

export class PathHelper {
  static join(...paths: string[]): string {
    return path.join(...paths);
  }

  static resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  static dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  static basename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  static extname(filePath: string): string {
    return path.extname(filePath);
  }

  static parse(filePath: string): path.ParsedPath {
    return path.parse(filePath);
  }

  static relative(from: string, to: string): string {
    return path.relative(from, to);
  }

  static isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  static normalize(filePath: string): string {
    return path.normalize(filePath);
  }

  static get sep(): string {
    return path.sep;
  }

  static get posix() {
    return {
      join: (...paths: string[]) => path.posix.join(...paths),
      dirname: (filePath: string) => path.posix.dirname(filePath),
      basename: (filePath: string, ext?: string) => path.posix.basename(filePath, ext),
      extname: (filePath: string) => path.posix.extname(filePath),
      relative: (from: string, to: string) => path.posix.relative(from, to),
      resolve: (...paths: string[]) => path.posix.resolve(...paths),
      normalize: (filePath: string) => path.posix.normalize(filePath),
      isAbsolute: (filePath: string) => path.posix.isAbsolute(filePath),
      parse: (filePath: string) => path.posix.parse(filePath),
      sep: path.posix.sep,
    };
  }
}
