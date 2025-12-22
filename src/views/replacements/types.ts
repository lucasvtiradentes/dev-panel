export enum OnBranchChange {
  Revert = 'revert',
  AutoApply = 'auto-apply',
}

export enum ReplacementType {
  File = 'file',
  Patch = 'patch',
}

export type PatchItem = {
  search: string | string[];
  replace: string | string[];
};

type BaseReplacement = {
  name: string;
  description?: string;
  group?: string;
  onBranchChange?: OnBranchChange;
};

type FileReplacement = BaseReplacement & {
  type: ReplacementType.File;
  source: string;
  target: string;
};

type PatchReplacement = BaseReplacement & {
  type: ReplacementType.Patch;
  target: string;
  patches: PatchItem[];
};

export type Replacement = FileReplacement | PatchReplacement;

export type PPConfig = {
  configs?: unknown[];
  replacements?: Replacement[];
};
