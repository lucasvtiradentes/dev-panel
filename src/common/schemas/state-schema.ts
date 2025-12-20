import { z } from 'zod';

export const BPMStateSchema = z.object({
  debug: z.boolean().optional(),
  activeReplacements: z.array(z.string()).optional(),
  lastBranch: z.string().optional(),
  environment: z.string().optional(),
});
