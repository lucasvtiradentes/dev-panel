import type * as vscode from 'vscode';

export type GitAPI = {
  repositories: GitRepository[];
  onDidOpenRepository: vscode.Event<GitRepository>;
};

export type GitRepository = {
  state: {
    HEAD?: { name?: string };
  };
  onDidCheckout: vscode.Event<void>;
};

export type BranchChangeCallback = (newBranch: string) => void;
export type RefreshCallback = () => void;
