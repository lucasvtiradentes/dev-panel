import type * as vscode from 'vscode';

export type PromptProvider = {
  name: string;
  executeInteractive: (terminal: vscode.Terminal, promptContent: string) => void;
  getExecuteCommand: (tempFile: string, outputFile: string) => string;
};
