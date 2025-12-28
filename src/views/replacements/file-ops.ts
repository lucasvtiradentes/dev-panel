import type { DevPanelReplacement, NormalizedPatchItem } from '../../common/schemas';
import { FileIOHelper, NodePathHelper } from '../../common/utils/helpers/node-helper';

export function applyFileReplacement(workspace: string, source: string, target: string) {
  const sourcePath = NodePathHelper.join(workspace, source);
  const targetPath = NodePathHelper.join(workspace, target);
  FileIOHelper.copyFile(sourcePath, targetPath);
}

function normalizeSearchReplace(value: string[]): string {
  return value.join('\n');
}

export function applyPatches(workspace: string, target: string, patches: NormalizedPatchItem[]) {
  const targetPath = NodePathHelper.join(workspace, target);
  let content = FileIOHelper.readFile(targetPath);

  for (const patch of patches) {
    const search = normalizeSearchReplace(patch.search);
    const replace = normalizeSearchReplace(patch.replace);
    content = content.split(search).join(replace);
  }

  FileIOHelper.writeFile(targetPath, content);
}

export function fileExists(workspace: string, filePath: string): boolean {
  return FileIOHelper.fileExists(NodePathHelper.join(workspace, filePath));
}

export function isReplacementActive(workspace: string, replacement: DevPanelReplacement): boolean {
  const targetPath = NodePathHelper.join(workspace, replacement.target);

  if (!FileIOHelper.fileExists(targetPath)) {
    return false;
  }

  const targetContent = FileIOHelper.readFile(targetPath);

  if (replacement.type === 'patch') {
    const patches = replacement.patches as unknown as NormalizedPatchItem[];
    if (!patches || patches.length === 0) return false;

    const firstReplace = normalizeSearchReplace(patches[0].replace);
    return targetContent.includes(firstReplace);
  }

  if (replacement.type === 'file') {
    const sourcePath = NodePathHelper.join(workspace, replacement.source);
    if (!FileIOHelper.fileExists(sourcePath)) return false;

    const sourceContent = FileIOHelper.readFile(sourcePath);
    return targetContent === sourceContent;
  }

  return false;
}
