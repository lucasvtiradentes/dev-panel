import * as fs from 'node:fs';

export class FileIOHelper {
  static readFileIfExists(filePath: string): string | null {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  static readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  static writeFile(filePath: string, content: string) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  static appendFile(filePath: string, content: string) {
    fs.appendFileSync(filePath, content, 'utf-8');
  }

  static fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  static ensureDirectoryExists(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  static deleteFile(filePath: string) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  static deleteDirectory(dirPath: string) {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true });
    }
  }

  static copyFile(sourcePath: string, targetPath: string) {
    fs.copyFileSync(sourcePath, targetPath);
  }

  static readDirectory(dirPath: string, options?: { withFileTypes: true }): fs.Dirent[];
  static readDirectory(dirPath: string, options?: { withFileTypes?: false }): string[];
  static readDirectory(dirPath: string, options?: { withFileTypes?: boolean }): string[] | fs.Dirent[] {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    if (options?.withFileTypes) {
      return fs.readdirSync(dirPath, { withFileTypes: true });
    }
    return fs.readdirSync(dirPath);
  }

  static copyDirectory(sourcePath: string, targetPath: string) {
    if (fs.existsSync(sourcePath)) {
      fs.cpSync(sourcePath, targetPath, { recursive: true });
    }
  }
}
