import { z } from 'zod';

const SourceStateSchema = z.object({
  flatOrder: z.array(z.string()),
  groupOrder: z.array(z.string()),
  favorites: z.array(z.string()),
  hidden: z.array(z.string()),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
});

const TasksGlobalStateSchema = z.object({
  isGrouped: z.boolean(),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
  devpanel: SourceStateSchema,
});

const ToolsStateSchema = z.object({
  isGrouped: z.boolean(),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
  devpanel: SourceStateSchema,
  activeTools: z.array(z.string()),
});

const PromptsStateSchema = z.object({
  isGrouped: z.boolean(),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
  devpanel: SourceStateSchema,
});

const GlobalUIStateSchema = z.object({
  tasks: TasksGlobalStateSchema.optional(),
  tools: ToolsStateSchema.optional(),
  prompts: PromptsStateSchema.optional(),
});

export type TasksGlobalState = z.infer<typeof TasksGlobalStateSchema>;
export type GlobalUIState = z.infer<typeof GlobalUIStateSchema>;

const DEFAULT_SOURCE_STATE = {
  flatOrder: [],
  groupOrder: [],
  favorites: [],
  hidden: [],
};

const DEFAULT_TOOLS_STATE_GLOBAL = {
  isGrouped: false,
  devpanel: { ...DEFAULT_SOURCE_STATE },
  activeTools: [],
};

const DEFAULT_PROMPTS_STATE_GLOBAL = {
  isGrouped: false,
  devpanel: { ...DEFAULT_SOURCE_STATE },
};

export const DEFAULT_TASKS_GLOBAL_STATE: TasksGlobalState = {
  isGrouped: false,
  devpanel: { ...DEFAULT_SOURCE_STATE },
};
