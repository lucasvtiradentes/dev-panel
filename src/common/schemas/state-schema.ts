import { z } from 'zod';

export const PPStateSchema = z.object({
  debug: z.boolean().optional(),
  activeReplacements: z.array(z.string()).optional(),
  lastBranch: z.string().optional(),
  environment: z.string().optional(),
});
