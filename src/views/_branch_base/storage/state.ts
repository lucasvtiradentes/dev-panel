import { BRANCH_CONTEXT_CACHE_TTL_MS } from '../../../common/constants';
import { FileHashCache } from '../../../common/lib/cache';
import { createLogger } from '../../../common/lib/logger';
import type { BranchContext } from '../../../common/schemas/types';
import { generateHashForFileContent } from '../../../common/utils/functions/generate-cache-key';
import { getFirstWorkspacePath } from '../../../common/vscode/workspace-utils';
import { loadBranchContextFromFile } from './file-storage';
import { getBranchContextFilePath } from './markdown-parser';

const logger = createLogger('BranchContextCache');
const contextCache = new FileHashCache<BranchContext>(BRANCH_CONTEXT_CACHE_TTL_MS);

export const loadBranchContext = (branchName: string): BranchContext => {
  const workspace = getFirstWorkspacePath();
  if (!workspace) return {};

  const filePath = getBranchContextFilePath(branchName);
  if (!filePath) return {};

  const cached = contextCache.getWithFileHash(branchName, filePath);
  if (cached) {
    logger.info(`[loadBranchContext] ✅ CACHE HIT for ${branchName}`);
    return cached;
  }

  logger.info(`[loadBranchContext] ⚡ CACHE MISS - parsing ${branchName}`);
  const context = loadBranchContextFromFile(workspace, branchName);
  contextCache.setWithFileHash(branchName, context, filePath);
  return context;
};

export const invalidateBranchContextCache = (branchName: string): void => {
  logger.info(`[invalidateBranchContextCache] Invalidating cache for ${branchName}`);
  contextCache.invalidate(branchName);
};

export const updateBranchContextCache = (branchName: string, context: BranchContext, markdownContent: string): void => {
  const contentHash = generateHashForFileContent(markdownContent);

  logger.info(
    `[updateBranchContextCache] Updating cache for ${branchName} (hash: ${contentHash.substring(0, 8)}..., content: ${markdownContent.length} bytes)`,
  );
  contextCache.set(branchName, context, contentHash);
  logger.info(`[updateBranchContextCache] ✅ Cache updated successfully for ${branchName}`);
};
