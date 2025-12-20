import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PatchItem, Replacement, ReplacementType } from './types';

export function applyFileReplacement(workspace: string, source: string, target: string): void {
  const sourcePath = path.join(workspace, source);
  const targetPath = path.join(workspace, target);
  fs.copyFileSync(sourcePath, targetPath);
}

function normalizeSearchReplace(value: string | string[]): string {
  if (Array.isArray(value)) {
    return value.join('\n');
  }
  return value;
}

export function applyPatches(workspace: string, target: string, patches: PatchItem[]): void {
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

export function isReplacementActive(workspace: string, replacement: Replacement): boolean {
  const targetPath = path.join(workspace, replacement.target);

  if (!fs.existsSync(targetPath)) {
    return false;
  }

  const targetContent = fs.readFileSync(targetPath, 'utf-8');

  if (replacement.type === ('patch' as ReplacementType)) {
    const patches = (replacement as { patches: PatchItem[] }).patches;
    if (!patches || patches.length === 0) return false;

    const firstReplace = normalizeSearchReplace(patches[0].replace);
    return targetContent.includes(firstReplace);
  }

  if (replacement.type === ('file' as ReplacementType)) {
    const sourcePath = path.join(workspace, (replacement as { source: string }).source);
    if (!fs.existsSync(sourcePath)) return false;

    const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
    return targetContent === sourceContent;
  }

  return false;
}
