import { BRANCH_TYPES, type BranchType } from '../../common/constants';

export function detectBranchType(branchName: string): BranchType {
  const normalizedName = branchName.toLowerCase();

  for (const type of BRANCH_TYPES) {
    if (normalizedName.startsWith(`${type}/`)) {
      return type;
    }
  }

  return 'other';
}

export function generateBranchTypeCheckboxes(selectedType: BranchType): string {
  return BRANCH_TYPES.map((type) => `[${type === selectedType ? 'x' : ' '}] ${type}`).join(' ');
}

export function parseBranchTypeCheckboxes(checkboxString: string): BranchType | undefined {
  const checkedMatch = checkboxString.match(/\[x\]\s*(\w+)/i);
  if (!checkedMatch) return undefined;

  const type = checkedMatch[1].toLowerCase() as BranchType;
  return BRANCH_TYPES.includes(type) ? type : undefined;
}
