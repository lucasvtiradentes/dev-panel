import * as vscode from 'vscode';
import { Git } from '../../../common/lib/git';
import { type DevPanelReplacement, ReplacementType, normalizePatchItem } from '../../../common/schemas';
import { FileIOHelper, NodePathHelper } from '../../../common/utils/helpers/node-helper';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import { ToastKind, VscodeHelper } from '../../../common/vscode/vscode-helper';
import type { Disposable } from '../../../common/vscode/vscode-types';
import { computePatchedContent } from '../../../views/replacements/file-ops';
import { getActiveReplacements } from '../../../views/replacements/state';

const DIFF_SCHEME = 'devpanel-diff';

type DiffContent = {
  left: string;
  right: string;
  leftLabel: string;
  rightLabel: string;
};

const contentCache = new Map<string, string>();

class DiffContentProvider implements vscode.TextDocumentContentProvider {
  provideTextDocumentContent(uri: vscode.Uri): string {
    return contentCache.get(uri.path) ?? '';
  }
}

async function computeDiffContent(
  workspace: string,
  replacement: DevPanelReplacement,
  isActive: boolean,
): Promise<DiffContent | null> {
  const targetPath = NodePathHelper.join(workspace, replacement.target);
  const targetExists = FileIOHelper.fileExists(targetPath);

  let currentContent = '';
  if (targetExists) {
    currentContent = FileIOHelper.readFile(targetPath);
  }

  if (isActive) {
    let originalContent: string;
    try {
      originalContent = await Git.getFileContent(workspace, replacement.target);
    } catch {
      originalContent = '';
    }

    const isNewFile = originalContent === '';
    return {
      left: currentContent,
      right: originalContent,
      leftLabel: isNewFile ? 'Current (created by replacement)' : 'Current (with replacement)',
      rightLabel: isNewFile ? 'After toggle OFF (file removed)' : 'After toggle OFF (original)',
    };
  }

  let afterContent: string;

  if (replacement.type === ReplacementType.File) {
    const sourcePath = NodePathHelper.join(workspace, replacement.source);
    try {
      afterContent = FileIOHelper.readFile(sourcePath);
    } catch {
      return null;
    }
  } else {
    if (!targetExists) {
      return null;
    }
    const patches = replacement.patches.map(normalizePatchItem);
    afterContent = computePatchedContent(currentContent, patches);
  }

  const isNewFile = !targetExists;
  return {
    left: currentContent,
    right: afterContent,
    leftLabel: isNewFile ? 'Current (file does not exist)' : 'Current (original)',
    rightLabel: isNewFile ? 'After toggle ON (file created)' : 'After toggle ON (with replacement)',
  };
}

type PreviewReplacementDiffParams = { replacement?: DevPanelReplacement };

export function createPreviewReplacementDiffCommand(): Disposable[] {
  const diffProvider = new DiffContentProvider();
  const providerDisposable = vscode.workspace.registerTextDocumentContentProvider(DIFF_SCHEME, diffProvider);

  const commandDisposable = registerCommand(
    Command.PreviewReplacementDiff,
    async (item: PreviewReplacementDiffParams) => {
      if (!item?.replacement) return;

      const workspace = VscodeHelper.getFirstWorkspacePath();
      if (!workspace) return;

      const activeReplacements = getActiveReplacements();
      const isActive = activeReplacements.includes(item.replacement.name);

      const diffContent = await computeDiffContent(workspace, item.replacement, isActive);
      if (!diffContent) {
        VscodeHelper.showToastMessage(ToastKind.Error, 'Could not generate diff preview');
        return;
      }

      const timestamp = Date.now();
      const leftPath = `/${timestamp}/left/${item.replacement.target}`;
      const rightPath = `/${timestamp}/right/${item.replacement.target}`;

      contentCache.set(leftPath, diffContent.left);
      contentCache.set(rightPath, diffContent.right);

      const leftUri = vscode.Uri.parse(`${DIFF_SCHEME}:${leftPath}`);
      const rightUri = vscode.Uri.parse(`${DIFF_SCHEME}:${rightPath}`);

      const title = `${item.replacement.name}: ${diffContent.leftLabel} ↔ ${diffContent.rightLabel}`;
      await VscodeHelper.showDiff(leftUri, rightUri, title);

      setTimeout(() => {
        contentCache.delete(leftPath);
        contentCache.delete(rightPath);
      }, 60000);
    },
  );

  const cleanupDisposable: Disposable = {
    dispose: () => {
      contentCache.clear();
    },
  };

  return [providerDisposable, commandDisposable, cleanupDisposable];
}
