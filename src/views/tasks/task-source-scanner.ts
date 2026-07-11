import { DEFAULT_EXCLUDED_DIRS, DIST_DIR_PREFIX } from '../../common/constants';
import { FileIOHelper, NodePathHelper } from '../../common/utils/helpers/node-helper';

const DEFAULT_MAX_DEPTH = 5;

function normalizeRelativePath(filePath: string): string {
  return filePath.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
}

function isExcludedDirectory(
  rootPath: string,
  directoryPath: string,
  directoryName: string,
  customIgnorePaths: Set<string>,
): boolean {
  const isDefaultExcludedDirectory =
    DEFAULT_EXCLUDED_DIRS.includes(directoryName) || directoryName.startsWith(DIST_DIR_PREFIX);
  if (isDefaultExcludedDirectory) return true;

  const absolutePath = NodePathHelper.join(directoryPath, directoryName);
  const relativePath = normalizeRelativePath(NodePathHelper.relative(rootPath, absolutePath));
  return customIgnorePaths.has(relativePath);
}

export function findTaskSourceFiles(
  rootPath: string,
  fileNames: readonly string[],
  customIgnorePaths: string[],
  maxDepth = DEFAULT_MAX_DEPTH,
): string[] {
  const normalizedIgnorePaths = new Set(customIgnorePaths.map(normalizeRelativePath));
  return findTaskSourceFilesRecursive(rootPath, rootPath, new Set(fileNames), normalizedIgnorePaths, maxDepth);
}

function findTaskSourceFilesRecursive(
  rootPath: string,
  currentPath: string,
  fileNames: Set<string>,
  customIgnorePaths: Set<string>,
  maxDepth: number,
  currentDepth = 0,
): string[] {
  if (currentDepth > maxDepth) return [];

  try {
    return FileIOHelper.readDirectory(currentPath, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = NodePathHelper.join(currentPath, entry.name);
      if (entry.isFile() && fileNames.has(entry.name)) return [entryPath];
      if (!entry.isDirectory()) return [];
      if (isExcludedDirectory(rootPath, currentPath, entry.name, customIgnorePaths)) return [];
      return findTaskSourceFilesRecursive(
        rootPath,
        entryPath,
        fileNames,
        customIgnorePaths,
        maxDepth,
        currentDepth + 1,
      );
    });
  } catch {
    return [];
  }
}
