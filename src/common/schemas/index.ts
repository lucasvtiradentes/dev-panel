// Config schema exports (for .pp/config.jsonc)
export {
  type PPConfig,
  type PPPrompt,
  type PPPromptInput,
  type PPInput,
  type PPSettings,
  PPConfigSchema,
  AIProvider,
  PromptExecutionMode,
  PromptInputType,
} from './config-schema';

// VSCode workspace schema exports (for VSCode workspace state)
export {
  type VariablesState,
  type PromptsState,
  type ReplacementsState,
  type SourceState,
  type TasksState,
  type TasksGlobalState,
  type ToolsState,
  type BranchContextState,
  type WorkspaceUIState,
  type GlobalUIState,
  DEFAULT_VARIABLES_STATE,
  DEFAULT_PROMPTS_STATE,
  DEFAULT_REPLACEMENTS_STATE,
  DEFAULT_SOURCE_STATE,
  DEFAULT_TASKS_STATE,
  DEFAULT_TASKS_GLOBAL_STATE,
  DEFAULT_TOOLS_STATE,
  DEFAULT_BRANCH_CONTEXT_STATE,
  DEFAULT_WORKSPACE_UI_STATE,
} from './vscode-workspace-schema';
