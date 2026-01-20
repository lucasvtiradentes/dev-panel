import { z } from 'zod';

export const SourceStateSchema = z.object({
  flatOrder: z.array(z.string()),
  groupOrder: z.array(z.string()),
  favorites: z.array(z.string()),
  hidden: z.array(z.string()),
  showHidden: z.boolean().optional(),
  showOnlyFavorites: z.boolean().optional(),
});

export type SourceState = z.infer<typeof SourceStateSchema>;

export const DEFAULT_SOURCE_STATE: SourceState = {
  flatOrder: [],
  groupOrder: [],
  favorites: [],
  hidden: [],
};
