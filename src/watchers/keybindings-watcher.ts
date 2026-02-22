import { CONTEXT_PREFIX, KEYBINDINGS_FILE } from '../common/constants';
import { createLogger } from '../common/lib/logger';
import { KeybindingsHelper } from '../common/utils/helpers/keybindings-helper';
import { FileIOHelper, NodePathHelper } from '../common/utils/helpers/node-helper';
import { TypeGuardsHelper } from '../common/utils/helpers/type-guards-helper';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import { getVSCodeKeybindingsPath } from '../common/vscode/vscode-keybindings-utils';
import type { Disposable } from '../common/vscode/vscode-types';
import { type RefreshCallback, WATCHER_CONSTANTS, attachFileWatcherHandlers } from '../common/vscode/vscode-watcher';
import { buildWorkspaceWhenClause, getWorkspaceId } from '../common/vscode/vscode-workspace';

const logger = createLogger('KeybindingsWatcher');

function createKeybindingsUpdater() {
  let isUpdating = false;

  return {
    updateKeybindings() {
      if (isUpdating) return;

      const workspaceId = getWorkspaceId();
      if (!workspaceId) return;

      const keybindingsPath = getVSCodeKeybindingsPath();
      if (!FileIOHelper.fileExists(keybindingsPath)) return;

      let keybindings: { key: string; command: string; when?: string }[];
      try {
        keybindings = KeybindingsHelper.load(keybindingsPath);
      } catch (error: unknown) {
        logger.error(`Failed to read keybindings file: ${TypeGuardsHelper.getErrorMessage(error)}`);
        return;
      }

      const expectedWhen = buildWorkspaceWhenClause(workspaceId);
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
          KeybindingsHelper.save(keybindingsPath, keybindings);
        } catch (error: unknown) {
          logger.error(`Failed to write keybindings file: ${TypeGuardsHelper.getErrorMessage(error)}`);
        } finally {
          setTimeout(() => {
            isUpdating = false;
          }, WATCHER_CONSTANTS.KEYBINDING_UPDATE_DEBOUNCE_MS);
        }
      }
    },
  };
}

export function createKeybindingsWatcher(onKeybindingsChange: RefreshCallback): Disposable {
  const keybindingsPath = getVSCodeKeybindingsPath();

  if (!FileIOHelper.fileExists(keybindingsPath)) {
    return { dispose: () => undefined };
  }

  const updater = createKeybindingsUpdater();

  const watcher = VscodeHelper.createFileSystemWatcher(
    VscodeHelper.createRelativePattern(NodePathHelper.dirname(keybindingsPath), KEYBINDINGS_FILE),
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
