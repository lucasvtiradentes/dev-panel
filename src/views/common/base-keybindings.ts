import * as fs from 'node:fs';
import JSON5 from 'json5';
import { CONTEXT_PREFIX } from '../../common/constants';
import { getVSCodeKeybindingsPath } from '../../common/lib/vscode-keybindings-utils';
import { getWorkspaceId } from '../../common/lib/vscode-utils';
import type { KeybindingConfig } from './types';

type VSCodeKeybinding = { key: string; command: string; when?: string };

export class KeybindingManager {
  private keybindings: VSCodeKeybinding[] = [];
  private workspaceId: string | null = null;

  constructor(private readonly config: KeybindingConfig) {
    this.loadKeybindings();
  }

  reload(): void {
    this.loadKeybindings();
  }

  private loadKeybindings(): void {
    const filePath = getVSCodeKeybindingsPath();

    if (!fs.existsSync(filePath)) {
      this.keybindings = [];
      return;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      this.keybindings = content.trim() ? JSON5.parse(content) : [];
    } catch {
      this.keybindings = [];
    }

    this.workspaceId = getWorkspaceId();
  }

  private matchesWorkspace(kb: VSCodeKeybinding): boolean {
    if (!this.workspaceId) return !kb.when;
    return kb.when?.includes(`${CONTEXT_PREFIX}.workspaceId == '${this.workspaceId}'`) ?? false;
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
