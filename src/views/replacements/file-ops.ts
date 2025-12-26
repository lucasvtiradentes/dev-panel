import * as fs from 'node:fs';
import * as path from 'node:path';
import type { DevPanelReplacement, NormalizedPatchItem } from '../../common/schemas';

export function applyFileReplacement(workspace: string, source: string, target: string): void {
  const sourcePath = path.join(workspace, source);
  const targetPath = path.join(workspace, target);
  fs.copyFileSync(sourcePath, targetPath);
}

function normalizeSearchReplace(value: string[]): string {
  return value.join('\n');
}

export function applyPatches(workspace: string, target: string, patches: NormalizedPatchItem[]): void {
  const targetPath = path.join(workspace, target);
  let content = fs.readFileSync(targetPath, 'utf-8');

  for (const patch of patches) {
    const search = normalizeSearchReplace(patch.search);
    const replace = normalizeSearchReplace(patch.replace);
    content = content.split(search).join(replace);
  }

  fs.writeFileSync(targetPath, content);
}

export function fileExists(workspace: string, filePath: string): boolean {
  return fs.existsSync(path.join(workspace, filePath));
}

export function isReplacementActive(workspace: string, replacement: DevPanelReplacement): boolean {
  const targetPath = path.join(workspace, replacement.target);

  if (!fs.existsSync(targetPath)) {
    return false;
  }

  const targetContent = fs.readFileSync(targetPath, 'utf-8');

  if (replacement.type === 'patch') {
    const patches = replacement.patches as unknown as NormalizedPatchItem[];
    if (!patches || patches.length === 0) return false;

    const firstReplace = normalizeSearchReplace(patches[0].replace);
    return targetContent.includes(firstReplace);
  }

  if (replacement.type === 'file') {
    const sourcePath = path.join(workspace, replacement.source);
    if (!fs.existsSync(sourcePath)) return false;

    const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
    return targetContent === sourceContent;
  }

  return false;
}
