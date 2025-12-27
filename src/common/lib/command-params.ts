import type {
  EditBranchFieldParams,
  OpenBranchContextFileAtLineParams,
} from '../../commands/internal/branch-context/edit-branch-fields';
import type { CycleTaskStatusParams, ToggleTodoParams } from '../../commands/internal/branch-tasks/toggle-branch-tasks';
import type { ExecutePromptParams } from '../../commands/internal/execute-task';
import type { GoToPromptFileParams } from '../../commands/internal/prompts/go-to-prompt-file';
import type {
  TogglePromptFavoriteParams,
  TogglePromptHideParams,
} from '../../commands/internal/prompts/toggle-prompts-view';
import type { GoToReplacementTargetFileParams } from '../../commands/internal/replacements/go-to-replacement-target-file';
import type { ToggleReplacementParams } from '../../commands/internal/replacements/toggle-replacement';
import type { SelectConfigOptionParams } from '../../commands/internal/select-config-option';
import type { ToggleTaskFavoriteParams, ToggleTaskHideParams } from '../../commands/internal/tasks/toggle-tasks-view';
import type { GoToToolFileParams } from '../../commands/internal/tools/go-to-tool-file';
import type {
  ToggleToolFavoriteParams,
  ToggleToolHideParams,
  ToggleToolParams,
} from '../../commands/internal/tools/toggle-tools-view';
import type { Uri } from '../vscode/vscode-types';
import { Command } from './vscode-utils';

export type VscodeOpenParams = { uri: Uri; viewColumn?: number };
export type VscodeSetContextParams = { key: string; value: unknown };
export type VscodeOpenGlobalKeybindingsParams = { query: string };

export type CommandParams = {
  [Command.EditBranchName]: EditBranchFieldParams;
  [Command.EditBranchPrLink]: EditBranchFieldParams;
  [Command.EditBranchLinearLink]: EditBranchFieldParams;
  [Command.EditBranchObjective]: EditBranchFieldParams;
  [Command.EditBranchRequirements]: EditBranchFieldParams;
  [Command.EditBranchNotes]: EditBranchFieldParams;
  [Command.OpenBranchContextFileAtLine]: OpenBranchContextFileAtLineParams;
  [Command.ToggleFavorite]: ToggleTaskFavoriteParams;
  [Command.ToggleUnfavorite]: ToggleTaskFavoriteParams;
  [Command.ToggleHide]: ToggleTaskHideParams;
  [Command.ToggleToolFavorite]: ToggleToolFavoriteParams;
  [Command.ToggleToolUnfavorite]: ToggleToolFavoriteParams;
  [Command.ToggleToolHide]: ToggleToolHideParams;
  [Command.ToggleTool]: ToggleToolParams;
  [Command.GoToToolFile]: GoToToolFileParams;
  [Command.TogglePromptFavorite]: TogglePromptFavoriteParams;
  [Command.TogglePromptUnfavorite]: TogglePromptFavoriteParams;
  [Command.TogglePromptHide]: TogglePromptHideParams;
  [Command.GoToPromptFile]: GoToPromptFileParams;
  [Command.GoToReplacementTargetFile]: GoToReplacementTargetFileParams;
  [Command.ToggleTodo]: ToggleTodoParams;
  [Command.CycleTaskStatus]: CycleTaskStatusParams;
  [Command.ExecutePrompt]: ExecutePromptParams;
  [Command.ToggleReplacement]: ToggleReplacementParams;
  [Command.SelectConfigOption]: SelectConfigOptionParams;
  [Command.VscodeOpen]: VscodeOpenParams;
  [Command.VscodeSetContext]: VscodeSetContextParams;
  [Command.VscodeOpenGlobalKeybindings]: VscodeOpenGlobalKeybindingsParams;
};
