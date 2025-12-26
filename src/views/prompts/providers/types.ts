import type { Terminal } from '../../../common/vscode/vscode-types';

export type PromptProvider = {
  name: string;
  executeInteractive: (terminal: Terminal, promptContent: string) => void;
  getExecuteCommand: (tempFile: string, outputFile: string) => string;
};
