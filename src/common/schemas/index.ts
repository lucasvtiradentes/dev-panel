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

// State schema exports (for .pp/state.json)
export { PPStateSchema } from './state-schema';

// VSCode workspace schema exports (for VSCode workspace state)
export {
  type BranchContext,
  type BranchesState,
  type ConfigsState,
  type PromptsState,
  type ReplacementsState,
  type SourceState,
  type TasksState,
  type ToolsState,
  type WorkspaceUIState,
  DEFAULT_CONFIGS_STATE,
  DEFAULT_PROMPTS_STATE,
  DEFAULT_REPLACEMENTS_STATE,
  DEFAULT_SOURCE_STATE,
  DEFAULT_TASKS_STATE,
  DEFAULT_TOOLS_STATE,
  DEFAULT_WORKSPACE_UI_STATE,
} from './vscode-workspace-schema';
