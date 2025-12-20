import type * as vscode from 'vscode';

export type PromptExecuteOptions = {
  promptContent: string;
  folder: vscode.WorkspaceFolder;
  promptName: string;
};

export type PromptProvider = {
  name: string;
  executeInteractive: (terminal: vscode.Terminal, promptContent: string) => void;
  getExecuteCommand: (tempFile: string, outputFile: string) => string;
};
