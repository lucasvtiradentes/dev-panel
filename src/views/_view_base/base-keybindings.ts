import {
  type VSCodeKeybinding,
  loadKeybindings as loadVSCodeKeybindings,
} from '../../common/vscode/vscode-keybindings-utils';
import { buildWorkspaceWhenClause, getWorkspaceId } from '../../common/vscode/vscode-workspace';
import type { KeybindingConfig } from './types';

export class KeybindingManager {
  private keybindings: VSCodeKeybinding[] = [];
  private workspaceId: string | null = null;

  constructor(private readonly config: KeybindingConfig) {
    this.loadKeybindings();
  }

  reload() {
    this.loadKeybindings();
  }

  private loadKeybindings() {
    this.keybindings = loadVSCodeKeybindings();
    this.workspaceId = getWorkspaceId();
  }

  private matchesWorkspace(kb: VSCodeKeybinding): boolean {
    if (!this.workspaceId) return !kb.when;
    return kb.when?.includes(buildWorkspaceWhenClause(this.workspaceId)) ?? false;
  }

  getKeybinding(itemName: string): string | undefined {
    const commandId = this.config.getCommandId(itemName);
    const binding = this.keybindings.find((kb) => kb.command === commandId && this.matchesWorkspace(kb));
    return binding?.key;
  }

  getAllKeybindings(): Record<string, string> {
    const result: Record<string, string> = {};
    const prefix = this.config.commandPrefix;

    for (const kb of this.keybindings) {
      if (kb.command.startsWith(`${prefix}.`) && this.matchesWorkspace(kb)) {
        const itemName = kb.command.replace(`${prefix}.`, '');
        result[itemName] = kb.key;
      }
    }

    return result;
  }
}
