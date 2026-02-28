import { FileIOHelper, NodePathHelper } from '../../common/utils/helpers/node-helper';

export type ExcludeEntry = {
  id: number;
  pattern: string;
};

export type AddExcludeResult = {
  success: boolean;
  reason?: 'duplicate' | 'invalid_pattern' | 'file_error';
};

export function getExcludeFilePath(workspace: string): string {
  return NodePathHelper.join(workspace, '.git', 'info', 'exclude');
}

export function ensureExcludeFileExists(workspace: string): boolean {
  const filePath = getExcludeFilePath(workspace);
  if (FileIOHelper.fileExists(filePath)) return true;

  const infoDir = NodePathHelper.join(workspace, '.git', 'info');
  try {
    FileIOHelper.ensureDirectoryExists(infoDir);
    FileIOHelper.writeFile(filePath, '');
    return true;
  } catch {
    return false;
  }
}

function parseFile(content: string): { headerComments: string[]; patterns: string[] } {
  const lines = content.split('\n');
  const headerComments: string[] = [];
  const patterns: string[] = [];
  let inHeader = true;

  for (const line of lines) {
    const trimmed = line.trim();

    if (inHeader && (trimmed === '' || trimmed.startsWith('#'))) {
      headerComments.push(line);
    } else if (trimmed !== '' && !trimmed.startsWith('#')) {
      inHeader = false;
      patterns.push(trimmed);
    }
  }

  return { headerComments, patterns };
}

export function readExcludeFile(workspace: string): ExcludeEntry[] {
  const filePath = getExcludeFilePath(workspace);
  if (!FileIOHelper.fileExists(filePath)) return [];

  const content = FileIOHelper.readFile(filePath);
  const { patterns } = parseFile(content);

  return patterns.map((pattern, index) => ({
    id: index,
    pattern,
  }));
}

function writeExcludeFile(workspace: string, entries: ExcludeEntry[]): void {
  const filePath = getExcludeFilePath(workspace);

  let headerComments: string[] = [];
  if (FileIOHelper.fileExists(filePath)) {
    const content = FileIOHelper.readFile(filePath);
    const parsed = parseFile(content);
    headerComments = parsed.headerComments;
  }

  const patternLines = entries.map((e) => e.pattern);
  const allLines = [...headerComments, ...patternLines];

  FileIOHelper.writeFile(filePath, `${allLines.join('\n')}\n`);
}

function validatePattern(pattern: string): { valid: boolean; cleaned: string } {
  const cleaned = pattern.trim();

  if (cleaned === '') return { valid: false, cleaned: '' };
  if (cleaned.startsWith('#')) return { valid: false, cleaned: '' };

  return { valid: true, cleaned };
}

export function addExcludeEntry(workspace: string, pattern: string): AddExcludeResult {
  const { valid, cleaned } = validatePattern(pattern);
  if (!valid) return { success: false, reason: 'invalid_pattern' };

  if (!ensureExcludeFileExists(workspace)) {
    return { success: false, reason: 'file_error' };
  }

  const entries = readExcludeFile(workspace);
  const exists = entries.some((e) => e.pattern === cleaned);
  if (exists) return { success: false, reason: 'duplicate' };

  entries.push({
    id: entries.length,
    pattern: cleaned,
  });

  writeExcludeFile(workspace, entries);
  return { success: true };
}

export function removeExcludeEntry(workspace: string, entryId: number): void {
  const entries = readExcludeFile(workspace);
  const filtered = entries.filter((e) => e.id !== entryId);
  writeExcludeFile(workspace, filtered);
}
