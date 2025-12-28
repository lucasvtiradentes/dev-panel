import z from 'zod';

const envSchema = z.object({
  CI: z.string().optional(), // used to detect prod mode for building
  PLUGIN_CONTEXT: z.string().optional(), // used to send info to plugins
});

export const ENV = envSchema.parse(process.env);
