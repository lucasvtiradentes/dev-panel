import { CONTEXT_PREFIX, KEYBINDINGS_FILE } from '../common/constants';
import { createLogger } from '../common/lib/logger';
import { FileIOHelper } from '../common/lib/node-helper';
import { PathHelper } from '../common/utils/path-helper';
import { VscodeHelper } from '../common/vscode/vscode-helper';
import { getVSCodeKeybindingsPath, parseKeybindings } from '../common/vscode/vscode-keybindings-utils';
import type { Disposable } from '../common/vscode/vscode-types';
import { getWorkspaceId } from '../common/vscode/vscode-utils';
import { type RefreshCallback, WATCHER_CONSTANTS, attachFileWatcherHandlers } from './utils';

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
        const content = FileIOHelper.readFile(keybindingsPath);
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
          FileIOHelper.writeFile(keybindingsPath, JSON.stringify(keybindings, null, 2));
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

export function createKeybindingsWatcher(onKeybindingsChange: RefreshCallback): Disposable {
  const keybindingsPath = getVSCodeKeybindingsPath();

  if (!FileIOHelper.fileExists(keybindingsPath)) {
    return { dispose: () => undefined };
  }

  const updater = createKeybindingsUpdater();

  const watcher = VscodeHelper.createFileSystemWatcher(
    VscodeHelper.createRelativePattern(PathHelper.dirname(keybindingsPath), KEYBINDINGS_FILE),
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
