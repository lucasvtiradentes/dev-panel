import type {
  EditBranchFieldParams,
  OpenBranchContextFileAtLineParams,
} from '../../commands/internal/edit-branch-fields';
import type { GoToPromptFileParams } from '../../commands/internal/go-to-prompt-file';
import type { GoToReplacementTargetFileParams } from '../../commands/internal/go-to-replacement-target-file';
import type { GoToToolFileParams } from '../../commands/internal/go-to-tool-file';
import type { ToggleTodoParams } from '../../commands/internal/toggle-branch-tasks';
import type { TogglePromptFavoriteParams, TogglePromptHideParams } from '../../commands/internal/toggle-prompts-view';
import type { ToggleTaskFavoriteParams, ToggleTaskHideParams } from '../../commands/internal/toggle-tasks-view';
import type {
  ToggleToolFavoriteParams,
  ToggleToolHideParams,
  ToggleToolParams,
} from '../../commands/internal/toggle-tools-view';
import { Command } from './vscode-utils';

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
};
