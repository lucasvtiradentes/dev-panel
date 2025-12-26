import type { Event, Uri } from '../common/vscode/vscode-types';

export type GitAPI = {
  repositories: GitRepository[];
  onDidOpenRepository: Event<GitRepository>;
};

export type GitRepository = {
  state: {
    HEAD?: { name?: string };
  };
  onDidCheckout: Event<void>;
};

export type BranchChangeCallback = (newBranch: string) => void;
export type RefreshCallback = () => void;
type UriChangeCallback = (uri: Uri) => void;
