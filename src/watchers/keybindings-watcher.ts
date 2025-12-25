import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { CONTEXT_PREFIX, KEYBINDINGS_FILE } from '../common/constants';
import { createLogger } from '../common/lib/logger';
import { getVSCodeKeybindingsPath, parseKeybindings } from '../common/lib/vscode-keybindings-utils';
import { getWorkspaceId } from '../common/lib/vscode-utils';
import type { RefreshCallback } from './types';
import { WATCHER_CONSTANTS, attachFileWatcherHandlers } from './utils';

const logger = createLogger('KeybindingsWatcher');

function createKeybindingsUpdater() {
  let isUpdating = false;

  return {
    updateKeybindings(): void {
      if (isUpdating) return;

      const workspaceId = getWorkspaceId();
      if (!workspaceId) return;

      const keybindingsPath = getVSCodeKeybindingsPath();
      if (!fs.existsSync(keybindingsPath)) return;

      let keybindings: { key: string; command: string; when?: string }[];
      try {
        const content = fs.readFileSync(keybindingsPath, 'utf8');
        keybindings = parseKeybindings(content);
      } catch (error) {
        logger.error(`Failed to read keybindings file: ${String(error)}`);
        return;
      }

      const expectedWhen = `${CONTEXT_PREFIX}.workspaceId == '${workspaceId}'`;
      let modified = false;

      for (const kb of keybindings) {
        if (!kb.command.startsWith(CONTEXT_PREFIX)) continue;
        if (kb.when === expectedWhen) continue;
        if (kb.when?.includes(`${CONTEXT_PREFIX}.workspaceId`)) continue;

        kb.when = expectedWhen;
        modified = true;
      }

      if (modified) {
        isUpdating = true;
        try {
          fs.writeFileSync(keybindingsPath, JSON.stringify(keybindings, null, 2), 'utf8');
        } catch (error) {
          logger.error(`Failed to write keybindings file: ${String(error)}`);
        } finally {
          setTimeout(() => {
            isUpdating = false;
          }, WATCHER_CONSTANTS.KEYBINDING_UPDATE_DEBOUNCE_MS);
        }
      }
    },
  };
}

export function createKeybindingsWatcher(onKeybindingsChange: RefreshCallback): vscode.Disposable {
  const keybindingsPath = getVSCodeKeybindingsPath();

  if (!fs.existsSync(keybindingsPath)) {
    return { dispose: () => undefined };
  }

  const updater = createKeybindingsUpdater();

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(path.dirname(keybindingsPath), KEYBINDINGS_FILE),
  );

  const handleChange = () => {
    logger.info('Keybindings file changed, updating and notifying');
    updater.updateKeybindings();
    onKeybindingsChange();
  };

  attachFileWatcherHandlers(watcher, {
    onChange: handleChange,
    onCreate: handleChange,
    onDelete: () => onKeybindingsChange(),
  });

  return watcher;
}
