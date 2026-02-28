import { KEYBINDINGS_FILE } from '../common/constants';
import { hasWorkspaceIdWhen, isDevPanelCommand } from '../common/constants/functions';
import { createLogger } from '../common/lib/logger';
import { type Keybinding, KeybindingsHelper } from '../common/utils/helpers/keybindings-helper';
import { FileIOHelper, NodePathHelper } from '../common/utils/helpers/node-helper';
import { TypeGuardsHelper } from '../common/utils/helpers/type-guards-helper';
import { ToastKind, VscodeHelper } from '../common/vscode/vscode-helper';
import { getVSCodeKeybindingsPath } from '../common/vscode/vscode-keybindings-utils';
import type { Disposable } from '../common/vscode/vscode-types';
import { type RefreshCallback, attachFileWatcherHandlers } from '../common/vscode/vscode-watcher';
import { buildWorkspaceWhenClause, getWorkspaceId } from '../common/vscode/vscode-workspace';

const logger = createLogger('KeybindingsWatcher');

function getKeybindingsSnapshot(): Map<string, Keybinding> {
  const keybindingsPath = getVSCodeKeybindingsPath();
  try {
    const keybindings = KeybindingsHelper.load(keybindingsPath);
    const map = new Map<string, Keybinding>();
    for (const kb of keybindings) {
      if (typeof kb.command === 'string' && isDevPanelCommand(kb.command)) {
        map.set(`${kb.command}:${kb.key}`, kb);
      }
    }
    return map;
  } catch (error: unknown) {
    logger.error(`Failed to load keybindings: ${TypeGuardsHelper.getErrorMessage(error)}`);
    return new Map();
  }
}

function findNewUnscopedKeybindings(previous: Map<string, Keybinding>, current: Map<string, Keybinding>): Keybinding[] {
  const newUnscoped: Keybinding[] = [];

  for (const [key, kb] of current) {
    if (!previous.has(key) && !hasWorkspaceIdWhen(kb.when)) {
      newUnscoped.push(kb);
    }
  }

  return newUnscoped;
}

function patchKeybindingsBatch(keybindings: Keybinding[]) {
  const workspaceId = getWorkspaceId();
  if (!workspaceId) return;

  const keybindingsPath = getVSCodeKeybindingsPath();
  let allKeybindings: Keybinding[];

  try {
    allKeybindings = KeybindingsHelper.load(keybindingsPath);
  } catch (error: unknown) {
    logger.error(`Failed to load keybindings: ${TypeGuardsHelper.getErrorMessage(error)}`);
    return;
  }

  const expectedWhen = buildWorkspaceWhenClause(workspaceId);
  const toPatch = new Set(keybindings.map((kb) => `${kb.command}:${kb.key}`));

  for (const existing of allKeybindings) {
    const key = `${existing.command}:${existing.key}`;
    if (toPatch.has(key)) {
      existing.when = expectedWhen;
    }
  }

  try {
    KeybindingsHelper.save(keybindingsPath, allKeybindings);
    logger.info(`Patched ${keybindings.length} keybinding(s)`);
  } catch (error: unknown) {
    logger.error(`Failed to patch keybindings: ${TypeGuardsHelper.getErrorMessage(error)}`);
  }
}

function formatKeybindingsList(keybindings: Keybinding[]): string {
  return keybindings.map((kb) => `${kb.command.split('.').pop()} (${kb.key})`).join(', ');
}

async function promptToScopeKeybindings(keybindings: Keybinding[]): Promise<boolean> {
  if (keybindings.length === 0) return false;

  const message =
    keybindings.length === 1
      ? `Scope "${keybindings[0].command.split('.').pop()}" (${keybindings[0].key}) to this workspace only?`
      : `Scope ${keybindings.length} keybindings to this workspace only? (${formatKeybindingsList(keybindings)})`;

  const result = await VscodeHelper.showToastMessage(ToastKind.Info, message, 'Yes', 'No');

  if (result === 'Yes') {
    patchKeybindingsBatch(keybindings);
    return true;
  }
  return false;
}

export function createKeybindingsWatcher(onKeybindingsChange: RefreshCallback): Disposable {
  const keybindingsPath = getVSCodeKeybindingsPath();

  if (!FileIOHelper.fileExists(keybindingsPath)) {
    return { dispose: () => undefined };
  }

  let previousSnapshot = getKeybindingsSnapshot();
  let isProcessing = false;

  const watchDir = NodePathHelper.dirname(keybindingsPath);
  const watchPattern = VscodeHelper.createRelativePattern(watchDir, KEYBINDINGS_FILE);
  const watcher = VscodeHelper.createFileSystemWatcher(watchPattern);

  const handleChange = async () => {
    if (isProcessing) {
      logger.info('Skipping change event - already processing');
      return;
    }

    logger.info('Keybindings file changed');

    const currentSnapshot = getKeybindingsSnapshot();
    const newUnscoped = findNewUnscopedKeybindings(previousSnapshot, currentSnapshot);

    previousSnapshot = currentSnapshot;

    if (newUnscoped.length > 0) {
      logger.info(`Found ${newUnscoped.length} new unscoped keybinding(s)`);
      isProcessing = true;
      try {
        const patched = await promptToScopeKeybindings(newUnscoped);
        if (patched) {
          previousSnapshot = getKeybindingsSnapshot();
        }
      } finally {
        isProcessing = false;
      }
    }

    onKeybindingsChange();
  };

  attachFileWatcherHandlers(watcher, {
    onChange: () => void handleChange(),
    onCreate: () => void handleChange(),
    onDelete: () => {
      previousSnapshot = new Map();
      onKeybindingsChange();
    },
  });

  return watcher;
}
