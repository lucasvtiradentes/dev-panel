import { z } from 'zod';

export enum RegistryItemKind {
  Plugin = 'plugin',
  Prompt = 'prompt',
  Tool = 'tool',
  Script = 'script',
}

const RegistryItemSchema = z.object({
  name: z.string().describe('Unique identifier for the item'),
  kind: z.nativeEnum(RegistryItemKind).describe('Type of registry item'),
  category: z.string().describe('Category for organization'),
  description: z.string().describe('Human-readable description'),
  file: z.string().optional().describe('Main file name if different from default'),
});

export const RegistryIndexSchema = z.object({
  version: z.string().optional().describe('Registry version'),
  plugins: z.array(RegistryItemSchema.omit({ kind: true })).optional(),
  prompts: z.array(RegistryItemSchema.omit({ kind: true })).optional(),
  tools: z.array(RegistryItemSchema.omit({ kind: true })).optional(),
  scripts: z.array(RegistryItemSchema.omit({ kind: true })).optional(),
});

export type RegistryItem = z.infer<typeof RegistryItemSchema>;
export type RegistryIndex = z.infer<typeof RegistryIndexSchema>;
export type RegistryItemEntry = Omit<RegistryItem, 'kind'>;
