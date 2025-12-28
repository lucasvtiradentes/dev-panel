import {
  SECTION_NAME_BRANCH,
  SECTION_NAME_LINEAR_LINK,
  SECTION_NAME_NOTES,
  SECTION_NAME_OBJECTIVE,
  SECTION_NAME_PR_LINK,
  SECTION_NAME_REQUIREMENTS,
  SECTION_NAME_TASKS,
} from '../../../common/constants';
import { Command, registerCommand } from '../../../common/vscode/vscode-commands';
import type { Disposable } from '../../../common/vscode/vscode-types';
import type { BranchContextProvider } from '../../../views/branch-context';

export type EditBranchFieldParams = { branchName: string; value?: string };
export type OpenBranchContextFileAtLineParams = { branchName: string; sectionName: string };

export function createEditBranchFieldsCommands(branchContextProvider: BranchContextProvider): Disposable[] {
  return [
    registerCommand(Command.EditBranchName, () => branchContextProvider.editField(SECTION_NAME_BRANCH)),
    registerCommand(Command.EditBranchPrLink, () => branchContextProvider.editField(SECTION_NAME_PR_LINK)),
    registerCommand(Command.EditBranchLinearLink, () => branchContextProvider.editField(SECTION_NAME_LINEAR_LINK)),
    registerCommand(Command.EditBranchObjective, () => branchContextProvider.editField(SECTION_NAME_OBJECTIVE)),
    registerCommand(Command.EditBranchRequirements, () => branchContextProvider.editField(SECTION_NAME_REQUIREMENTS)),
    registerCommand(Command.EditBranchNotes, () => branchContextProvider.editField(SECTION_NAME_NOTES)),
    registerCommand(Command.EditBranchTodos, () => branchContextProvider.openMarkdownFileAtLine(SECTION_NAME_TASKS)),
    registerCommand(Command.OpenBranchContextFileAtLine, ({ sectionName }: OpenBranchContextFileAtLineParams) =>
      branchContextProvider.openMarkdownFileAtLine(sectionName),
    ),
  ];
}
