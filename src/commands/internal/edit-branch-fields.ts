import type * as vscode from 'vscode';
import {
  SECTION_NAME_BRANCH,
  SECTION_NAME_LINEAR_LINK,
  SECTION_NAME_NOTES,
  SECTION_NAME_OBJECTIVE,
  SECTION_NAME_PR_LINK,
  SECTION_NAME_REQUIREMENTS,
  SECTION_NAME_TASKS,
} from '../../common/constants';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import type { BranchContextProvider } from '../../views/branch-context';

export type EditBranchFieldParams = { branchName: string; value?: string };
export type OpenBranchContextFileAtLineParams = { branchName: string; sectionName: string };

export function createEditBranchFieldsCommands(branchContextProvider: BranchContextProvider): vscode.Disposable[] {
  return [
    registerCommand(Command.EditBranchName, ({ branchName, value }: EditBranchFieldParams) =>
      branchContextProvider.editField(branchName, SECTION_NAME_BRANCH, value),
    ),
    registerCommand(Command.EditBranchPrLink, ({ branchName, value }: EditBranchFieldParams) =>
      branchContextProvider.editField(branchName, SECTION_NAME_PR_LINK, value),
    ),
    registerCommand(Command.EditBranchLinearLink, ({ branchName, value }: EditBranchFieldParams) =>
      branchContextProvider.editField(branchName, SECTION_NAME_LINEAR_LINK, value),
    ),
    registerCommand(Command.EditBranchObjective, ({ branchName, value }: EditBranchFieldParams) =>
      branchContextProvider.editField(branchName, SECTION_NAME_OBJECTIVE, value),
    ),
    registerCommand(Command.EditBranchRequirements, ({ branchName, value }: EditBranchFieldParams) =>
      branchContextProvider.editField(branchName, SECTION_NAME_REQUIREMENTS, value),
    ),
    registerCommand(Command.EditBranchNotes, ({ branchName, value }: EditBranchFieldParams) =>
      branchContextProvider.editField(branchName, SECTION_NAME_NOTES, value),
    ),
    registerCommand(Command.EditBranchTodos, () => branchContextProvider.openMarkdownFileAtLine(SECTION_NAME_TASKS)),
    registerCommand(
      Command.OpenBranchContextFileAtLine,
      ({ branchName: _branchName, sectionName }: OpenBranchContextFileAtLineParams) =>
        branchContextProvider.openMarkdownFileAtLine(sectionName),
    ),
  ];
}
