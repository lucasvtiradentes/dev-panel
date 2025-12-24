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

export function createEditBranchFieldsCommands(branchContextProvider: BranchContextProvider): vscode.Disposable[] {
  return [
    registerCommand(Command.EditBranchName, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, SECTION_NAME_BRANCH, value),
    ),
    registerCommand(Command.EditBranchPrLink, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, SECTION_NAME_PR_LINK, value),
    ),
    registerCommand(Command.EditBranchLinearLink, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, SECTION_NAME_LINEAR_LINK, value),
    ),
    registerCommand(Command.EditBranchObjective, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, SECTION_NAME_OBJECTIVE, value),
    ),
    registerCommand(Command.EditBranchRequirements, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, SECTION_NAME_REQUIREMENTS, value),
    ),
    registerCommand(Command.EditBranchNotes, (branchName: string, value?: string) =>
      branchContextProvider.editField(branchName, SECTION_NAME_NOTES, value),
    ),
    registerCommand(Command.EditBranchTodos, () => branchContextProvider.openMarkdownFileAtLine(SECTION_NAME_TASKS)),
    registerCommand(Command.OpenBranchContextFileAtLine, (_branchName: string, sectionName: string) =>
      branchContextProvider.openMarkdownFileAtLine(sectionName),
    ),
  ];
}
