export enum OnBranchChange {
  Revert = 'revert',
  AutoApply = 'auto-apply',
}

export enum ReplacementType {
  File = 'file',
  Patch = 'patch',
}

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
  type: ReplacementType.File;
  source: string;
  target: string;
}

interface PatchReplacement extends BaseReplacement {
  type: ReplacementType.Patch;
  target: string;
  patches: PatchItem[];
}

export type Replacement = FileReplacement | PatchReplacement;

export interface ReplacementState {
  activeReplacements: string[];
  lastBranch: string;
}

export interface PPConfig {
  configs?: unknown[];
  replacements?: Replacement[];
}
