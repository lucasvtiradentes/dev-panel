import { BRANCH_CONTEXT_CACHE_TTL_MS } from '../../../common/constants';
import { createLogger } from '../../../common/lib/logger';
import type { BranchContext } from '../../../common/schemas/types';
import { FileHashCache } from '../../../common/utils/cache';
import { getFirstWorkspacePath } from '../../../common/utils/workspace-utils';
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
