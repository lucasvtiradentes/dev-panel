type OnBranchChange = 'revert' | 'auto-apply' | 'keep';

export interface PatchItem {
  search: string | string[];
  replace: string | string[];
}

interface BaseReplacement {
  name: string;
  description?: string;
  group?: string;
  onBranchChange?: OnBranchChange;
}

interface FileReplacement extends BaseReplacement {
  type: 'file';
  source: string;
  target: string;
}

interface PatchReplacement extends BaseReplacement {
  type: 'patch';
  target: string;
  patches: PatchItem[];
}

export type Replacement = FileReplacement | PatchReplacement;

export interface ReplacementState {
  activeReplacements: string[];
  lastBranch: string;
}

export interface BpmConfig {
  configs?: unknown[];
  replacements?: Replacement[];
}
