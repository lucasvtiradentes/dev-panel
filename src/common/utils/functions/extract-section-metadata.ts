import { METADATA_SECTION_REGEX_CAPTURE, METADATA_SECTION_REGEX_GLOBAL } from '../../constants';
import { createLogger } from '../../lib/logger';
import { JsonHelper } from '../helpers/json-helper';
import { TypeGuardsHelper } from '../helpers/type-guards-helper';

const logger = createLogger('MetadataExtractor');

export function extractSectionMetadata(content: string): { cleanContent: string; metadata?: Record<string, unknown> } {
  const metadataMatch = content.match(METADATA_SECTION_REGEX_CAPTURE);
  if (!metadataMatch) {
    return { cleanContent: content };
  }

  const parsed = JsonHelper.parse(metadataMatch[1]);
  if (parsed && TypeGuardsHelper.isObject(parsed)) {
    const metadata = parsed as Record<string, unknown>;
    const cleanContent = content.replace(METADATA_SECTION_REGEX_GLOBAL, '').trim();
    logger.info(
      `[extractSectionMetadata] Found metadata: ${JsonHelper.stringify(metadata).substring(0, 100)}, content length: ${cleanContent.length}`,
    );
    return { cleanContent, metadata };
  }
  return { cleanContent: content };
}
