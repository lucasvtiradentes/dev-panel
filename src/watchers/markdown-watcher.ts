import * as vscode from 'vscode';
import { ROOT_BRANCH_CONTEXT_FILE_NAME } from '../common/constants/scripts-constants';
import { getBranchContextGlobPattern, getBranchContextTemplatePath } from '../common/lib/config-manager';
import { createLogger } from '../common/lib/logger';
import type { RefreshCallback, UriChangeCallback } from './types';
import { attachFileWatcherHandlers, getWorkspacePath } from './utils';

const logger = createLogger('MarkdownWatcher');

type MarkdownWatcherCallbacks = {
  onBranchMarkdownChange: UriChangeCallback;
  onRootMarkdownChange: RefreshCallback;
  onTemplateChange: RefreshCallback;
};

export function createMarkdownWatcher(callbacks: MarkdownWatcherCallbacks): vscode.Disposable {
  logger.info('[createMarkdownWatcher] START');
  const disposables: vscode.Disposable[] = [];
  const workspace = getWorkspacePath();

  if (!workspace) {
    logger.warn('[createMarkdownWatcher] No workspace found, watchers not created');
    return { dispose: () => undefined };
  }

  logger.info(`[createMarkdownWatcher] Workspace: ${workspace}`);

  const branchMarkdownWatcher = createBranchMarkdownWatcher(workspace, callbacks.onBranchMarkdownChange);
  if (branchMarkdownWatcher) {
    disposables.push(branchMarkdownWatcher);
    logger.info('[createMarkdownWatcher] Branch markdown watcher OK');
  }

  const rootMarkdownWatcher = createRootMarkdownWatcher(workspace, callbacks.onRootMarkdownChange);
  if (rootMarkdownWatcher) {
    disposables.push(rootMarkdownWatcher);
    logger.info('[createMarkdownWatcher] Root markdown watcher OK');
  }

  const templateWatcher = createTemplateWatcher(workspace, callbacks.onTemplateChange);
  if (templateWatcher) {
    disposables.push(templateWatcher);
    logger.info('[createMarkdownWatcher] Template watcher OK');
  }

  logger.info(`[createMarkdownWatcher] END - ${disposables.length} watchers created`);

  return {
    dispose: () => {
      logger.info('[createMarkdownWatcher] Disposing watchers');
      for (const d of disposables) {
        d.dispose();
      }
    },
  };
}

function createBranchMarkdownWatcher(
  workspace: string,
  onChange: (uri: vscode.Uri) => void,
): vscode.FileSystemWatcher | null {
  const globPattern = getBranchContextGlobPattern();
  logger.info(`Setting up branch markdown watcher with pattern: ${globPattern}`);

  const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspace, globPattern));

  attachFileWatcherHandlers(watcher, {
    onChange,
    onCreate: onChange,
  });

  return watcher;
}

function createRootMarkdownWatcher(workspace: string, onChange: RefreshCallback): vscode.FileSystemWatcher | null {
  logger.info(`Setting up root markdown watcher for: ${ROOT_BRANCH_CONTEXT_FILE_NAME}`);

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspace, ROOT_BRANCH_CONTEXT_FILE_NAME),
  );

  attachFileWatcherHandlers(watcher, {
    onChange: () => onChange(),
    onCreate: () => onChange(),
  });

  return watcher;
}

function createTemplateWatcher(workspace: string, onChange: RefreshCallback): vscode.FileSystemWatcher | null {
  const templatePath = getBranchContextTemplatePath(workspace);
  logger.info(`Setting up template watcher for: ${templatePath}`);

  const watcher = vscode.workspace.createFileSystemWatcher(templatePath);

  attachFileWatcherHandlers(watcher, {
    onChange: () => onChange(),
    onCreate: () => onChange(),
  });

  return watcher;
}
