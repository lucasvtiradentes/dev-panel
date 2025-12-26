import type { Terminal } from '../../../common/vscode/vscode-types';
import type { PromptProvider } from './types';

export const cursorAgentProvider: PromptProvider = {
  name: 'Cursor Agent',
  executeInteractive: (terminal: Terminal, promptContent: string) => {
    const escapedPrompt = promptContent.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    terminal.sendText(`cursor-agent "${escapedPrompt}"`);
  },
  getExecuteCommand: (tempFile: string, outputFile: string) => {
    return `cursor-agent < "${tempFile}" > "${outputFile}"`;
  },
};
