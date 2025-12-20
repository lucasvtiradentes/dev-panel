import { AIProvider } from '../../../common/schemas/schemas';
import { claudeProvider } from './claude';
import { cursorAgentProvider } from './cursor-agent';
import { geminiProvider } from './gemini';
import type { PromptProvider } from './types';

export type { PromptProvider } from './types';

const providers: Record<AIProvider, PromptProvider> = {
  [AIProvider.Claude]: claudeProvider,
  [AIProvider.Gemini]: geminiProvider,
  [AIProvider.CursorAgent]: cursorAgentProvider,
};

export function getProvider(aiProvider?: AIProvider): PromptProvider | null {
  if (!aiProvider) return null;
  return providers[aiProvider];
}
