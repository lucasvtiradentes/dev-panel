import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Terminal } from '../../../common/vscode/vscode-types';
import type { PromptProvider } from './types';

export const geminiProvider: PromptProvider = {
  name: 'Gemini',
  executeInteractive: (terminal: Terminal, promptContent: string) => {
    const tempFile = path.join(os.tmpdir(), `devpanel-prompt-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, promptContent, 'utf-8');
    terminal.sendText(`gemini < "${tempFile}" && rm "${tempFile}"`);
  },
  getExecuteCommand: (tempFile: string, outputFile: string) => {
    return `gemini < "${tempFile}" > "${outputFile}"`;
  },
};
