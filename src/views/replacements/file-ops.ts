import { type DevPanelReplacement, type NormalizedPatchItem, ReplacementType } from '../../common/schemas';
import { FileIOHelper, NodePathHelper } from '../../common/utils/helpers/node-helper';

export function applyFileReplacement(workspace: string, source: string, target: string) {
  const sourcePath = NodePathHelper.join(workspace, source);
  const targetPath = NodePathHelper.join(workspace, target);
  FileIOHelper.copyFile(sourcePath, targetPath);
}

function normalizeSearchReplace(value: string[]): string {
  return value.join('\n');
}

type ApplyPatchesResult = {
  unmatchedPatches: number[];
};

export function applyPatches(workspace: string, target: string, patches: NormalizedPatchItem[]): ApplyPatchesResult {
  const targetPath = NodePathHelper.join(workspace, target);
  let content = FileIOHelper.readFile(targetPath);
  const unmatchedPatches: number[] = [];

  for (let i = 0; i < patches.length; i++) {
    const search = normalizeSearchReplace(patches[i].search);
    const replace = normalizeSearchReplace(patches[i].replace);

    if (!content.includes(search)) {
      unmatchedPatches.push(i + 1);
    }
    content = content.split(search).join(replace);
  }

  FileIOHelper.writeFile(targetPath, content);
  return { unmatchedPatches };
}

export function fileExists(workspace: string, filePath: string): boolean {
  return FileIOHelper.fileExists(NodePathHelper.join(workspace, filePath));
}

type IsReplacementActiveOptions = {
  workspace: string;
  replacement: DevPanelReplacement;
  normalizedPatches?: NormalizedPatchItem[];
};

export function isReplacementActive(options: IsReplacementActiveOptions): boolean {
  const { workspace, replacement, normalizedPatches } = options;
  const targetPath = NodePathHelper.join(workspace, replacement.target);

  if (!FileIOHelper.fileExists(targetPath)) {
    return false;
  }

  const targetContent = FileIOHelper.readFile(targetPath);

  if (replacement.type === ReplacementType.Patch) {
    if (!normalizedPatches || normalizedPatches.length === 0) return false;

    const firstReplace = normalizeSearchReplace(normalizedPatches[0].replace);
    return targetContent.includes(firstReplace);
  }

  if (replacement.type === ReplacementType.File) {
    const sourcePath = NodePathHelper.join(workspace, replacement.source);
    if (!FileIOHelper.fileExists(sourcePath)) return false;

    const sourceContent = FileIOHelper.readFile(sourcePath);
    return targetContent === sourceContent;
  }

  return false;
}
