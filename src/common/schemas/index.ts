// Config schema exports (for .bpm/config.jsonc)
export {
  type BPMConfig,
  type BPMPrompt,
  type BPMPromptInput,
  type BPMSettings,
  BPMConfigSchema,
  AIProvider,
  PromptInputType,
  SelectionStyle,
} from './config-schema';

// State schema exports (for .bpm/state.json)
export { BPMStateSchema } from './state-schema';

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
