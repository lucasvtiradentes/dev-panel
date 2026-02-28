import { exec, execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  type Dirent,
  type Stats,
  appendFileSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { get } from 'node:https';
import { homedir, platform, tmpdir } from 'node:os';
import {
  type ParsedPath,
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  normalize,
  parse,
  posix,
  relative,
  resolve,
  sep,
} from 'node:path';
import { promisify } from 'node:util';

export const execAsyncFn = promisify(exec);

export const UTF_ENCODING: BufferEncoding = 'utf-8';

export class NodePathHelper {
  static join(...paths: string[]): string {
    return join(...paths);
  }

  static resolve(...paths: string[]): string {
    return resolve(...paths);
  }

  static dirname(filePath: string): string {
    return dirname(filePath);
  }

  static basename(filePath: string, ext?: string): string {
    return basename(filePath, ext);
  }

  static extname(filePath: string): string {
    return extname(filePath);
  }

  static parse(filePath: string): ParsedPath {
    return parse(filePath);
  }

  static relative(from: string, to: string): string {
    return relative(from, to);
  }

  static isAbsolute(filePath: string): boolean {
    return isAbsolute(filePath);
  }

  static normalize(filePath: string): string {
    return normalize(filePath);
  }

  static get sep(): string {
    return sep;
  }

  static get posix() {
    return {
      join: (...paths: string[]) => posix.join(...paths),
      dirname: (filePath: string) => posix.dirname(filePath),
      basename: (filePath: string, ext?: string) => posix.basename(filePath, ext),
      extname: (filePath: string) => posix.extname(filePath),
      relative: (from: string, to: string) => posix.relative(from, to),
      resolve: (...paths: string[]) => posix.resolve(...paths),
      normalize: (filePath: string) => posix.normalize(filePath),
      isAbsolute: (filePath: string) => posix.isAbsolute(filePath),
      parse: (filePath: string) => posix.parse(filePath),
      sep: posix.sep,
    };
  }
}

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

  static stat(filePath: string): Stats {
    return statSync(filePath);
  }
}

export class NodeOsHelper {
  static homedir = homedir;
  static platform = platform;
  static tmpdir = tmpdir;
}

export class NodeCryptoHelper {
  static createHash = createHash;
}

export class NodeHttps {
  static get = get;
}

export class ShellHelper {
  private static isWindows = process.platform === 'win32';

  static execSync(command: string, cwd: string): string {
    return execSync(command, { cwd, encoding: 'utf-8' });
  }

  static execSyncSilent(command: string, cwd: string): boolean {
    try {
      execSync(command, { cwd, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  static getDeleteCommand(filePath: string): string {
    return ShellHelper.isWindows ? `del "${filePath}"` : `rm "${filePath}"`;
  }

  static buildChainedCommand(mainCmd: string, cleanupCmd: string): string {
    return ShellHelper.isWindows ? `${mainCmd} & ${cleanupCmd}` : `${mainCmd} && ${cleanupCmd}`;
  }
}

export class CliPathHelper {
  private static isWindows = process.platform === 'win32';

  private static getCliPaths(): Record<string, string[]> {
    if (CliPathHelper.isWindows) {
      const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
      const localAppData = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local');
      return {
        claude: [
          join(appData, 'Claude', 'claude.exe'),
          join(localAppData, 'Programs', 'claude', 'claude.exe'),
          join(homedir(), '.claude', 'local', 'claude.exe'),
        ],
        gemini: [join(appData, 'gemini', 'gemini.exe'), join(localAppData, 'Programs', 'gemini', 'gemini.exe')],
        'cursor-agent': [
          join(appData, 'cursor-agent', 'cursor-agent.exe'),
          join(localAppData, 'Programs', 'cursor-agent', 'cursor-agent.exe'),
        ],
      };
    }
    return {
      claude: [
        join(homedir(), '.claude', 'local', 'claude'),
        join(homedir(), '.local', 'bin', 'claude'),
        '/usr/local/bin/claude',
      ],
      gemini: [join(homedir(), '.local', 'bin', 'gemini'), '/usr/local/bin/gemini'],
      'cursor-agent': [join(homedir(), '.local', 'bin', 'cursor-agent'), '/usr/local/bin/cursor-agent'],
    };
  }

  static resolvePath(cliName: string): string {
    const cliPaths = CliPathHelper.getCliPaths();
    const knownPaths = cliPaths[cliName] ?? [];
    for (const p of knownPaths) {
      if (existsSync(p)) {
        return p;
      }
    }
    const exeName = CliPathHelper.isWindows ? `${cliName}.exe` : cliName;
    return exeName;
  }
}
