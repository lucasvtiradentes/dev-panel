import { createHash } from 'node:crypto';
import {
  type Dirent,
  appendFileSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { get } from 'node:https';
import { homedir, tmpdir } from 'node:os';

const UTF_ENCODING: BufferEncoding = 'utf-8';

export class FileIOHelper {
  static fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  static readFileIfExists(filePath: string): string | null {
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      return FileIOHelper.readFile(filePath);
    } catch {
      return null;
    }
  }

  static readFile(filePath: string): string {
    return readFileSync(filePath, UTF_ENCODING);
  }

  static writeFile(filePath: string, content: string) {
    writeFileSync(filePath, content, UTF_ENCODING);
  }

  static appendFile(filePath: string, content: string) {
    appendFileSync(filePath, content, UTF_ENCODING);
  }

  static ensureDirectoryExists(dirPath: string) {
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
  }

  static deleteFile(filePath: string) {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  static deleteDirectory(dirPath: string) {
    if (existsSync(dirPath)) {
      rmSync(dirPath, { recursive: true });
    }
  }

  static copyFile(sourcePath: string, targetPath: string) {
    copyFileSync(sourcePath, targetPath);
  }

  static readDirectory(dirPath: string, options?: { withFileTypes: true }): Dirent[];
  static readDirectory(dirPath: string, options?: { withFileTypes?: false }): string[];
  static readDirectory(dirPath: string, options?: { withFileTypes?: boolean }): string[] | Dirent[] {
    if (!existsSync(dirPath)) {
      return [];
    }
    if (options?.withFileTypes) {
      return readdirSync(dirPath, { withFileTypes: true });
    }
    return readdirSync(dirPath);
  }

  static copyDirectory(sourcePath: string, targetPath: string) {
    if (existsSync(sourcePath)) {
      cpSync(sourcePath, targetPath, { recursive: true });
    }
  }
}

export class NodeOsHelper {
  static homedir = homedir;

  static tmpdir = tmpdir;
}

export class NodeCryptoHelper {
  static createHash = createHash;
}

export class NodeHttps {
  static get = get;
}
