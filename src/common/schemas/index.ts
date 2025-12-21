// Config schema exports (for .pp/config.jsonc)
export {
  type PPConfig,
  type PPPrompt,
  type PPPromptInput,
  type PPSettings,
  PPConfigSchema,
  AIProvider,
  PromptInputType,
  SelectionStyle,
} from './config-schema';

// VSCode workspace schema exports (for VSCode workspace state)
export {
  type BranchContext,
  type BranchesState,
  type VariablesState,
  type PromptsState,
  type ReplacementsState,
  type SourceState,
  type TasksState,
  type ToolsState,
  type WorkspaceUIState,
  DEFAULT_VARIABLES_STATE,
  DEFAULT_PROMPTS_STATE,
  DEFAULT_REPLACEMENTS_STATE,
  DEFAULT_SOURCE_STATE,
  DEFAULT_TASKS_STATE,
  DEFAULT_TOOLS_STATE,
  DEFAULT_WORKSPACE_UI_STATE,
} from './vscode-workspace-schema';
