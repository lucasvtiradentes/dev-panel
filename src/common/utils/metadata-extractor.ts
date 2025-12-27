import { createLogger } from '../lib/logger';

const logger = createLogger('MetadataExtractor');

export function extractSectionMetadata(content: string): { cleanContent: string; metadata?: Record<string, unknown> } {
  const metadataMatch = content.match(/<!--\s*SECTION_METADATA:\s*(.+?)\s*-->/);
  if (!metadataMatch) {
    return { cleanContent: content };
  }

  try {
    const parsed = JSON.parse(metadataMatch[1]);
    if (typeof parsed === 'object' && parsed !== null) {
      const metadata = parsed as Record<string, unknown>;
      const cleanContent = content.replace(/<!--\s*SECTION_METADATA:.*?-->/g, '').trim();
      logger.info(
        `[extractSectionMetadata] Found metadata: ${JSON.stringify(metadata).substring(0, 100)}, content length: ${cleanContent.length}`,
      );
      return { cleanContent, metadata };
    }
    return { cleanContent: content };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[extractSectionMetadata] Failed to parse metadata: ${message}`);
    return { cleanContent: content };
  }
}
