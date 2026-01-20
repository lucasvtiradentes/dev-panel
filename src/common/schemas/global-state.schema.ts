import { z } from 'zod';
import { DEFAULT_SOURCE_STATE, SourceStateSchema } from './shared-state.schema';

const TasksGlobalStateSchema = z.object({
  isGrouped: z.boolean(),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
  devpanel: SourceStateSchema,
});

const GlobalUIStateSchema = z.object({
  tasks: TasksGlobalStateSchema.optional(),
});

export type TasksGlobalState = z.infer<typeof TasksGlobalStateSchema>;
export type GlobalUIState = z.infer<typeof GlobalUIStateSchema>;

export const DEFAULT_TASKS_GLOBAL_STATE: TasksGlobalState = {
  isGrouped: false,
  devpanel: { ...DEFAULT_SOURCE_STATE },
};
