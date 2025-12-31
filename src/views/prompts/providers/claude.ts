import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Terminal } from '../../../common/vscode/vscode-types';
import type { PromptProvider } from './types';

export const claudeProvider: PromptProvider = {
  name: 'Claude',
  executeInteractive: (terminal: Terminal, promptContent: string) => {
    const tempFile = path.join(os.tmpdir(), `devpanel-prompt-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, promptContent, 'utf-8');
    terminal.sendText(`claude --dangerously-skip-permissions < "${tempFile}" && rm "${tempFile}"`);
  },
  getExecuteCommand: (tempFile: string, outputFile: string) => {
    return `claude --dangerously-skip-permissions --print < "${tempFile}" > "${outputFile}"`;
  },
};
