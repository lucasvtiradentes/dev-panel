import { BRANCH_CONTEXT_CACHE_TTL_MS } from '../../../common/constants';
import { FileHashCache } from '../../../common/lib/cache';
import { createLogger } from '../../../common/lib/logger';
import type { BranchContext } from '../../../common/schemas/types';
import { generateHashForFileContent } from '../../../common/utils/functions/generate-cache-key';
import { VscodeHelper } from '../../../common/vscode/vscode-helper';
import { loadBranchContextFromFile } from './file-storage';
import { getBranchContextFilePath } from './markdown-parser';

const logger = createLogger('BranchContextCache');
const contextCache = new FileHashCache<BranchContext>(BRANCH_CONTEXT_CACHE_TTL_MS);

export const loadBranchContext = (branchName: string): BranchContext => {
  logger.info(`[loadBranchContext] Called for branch='${branchName}'`);
  const workspace = VscodeHelper.getFirstWorkspacePath();
  if (!workspace) {
    logger.warn('[loadBranchContext] No workspace, returning empty');
    return {};
  }

  const filePath = getBranchContextFilePath(branchName);
  if (!filePath) {
    logger.warn(`[loadBranchContext] No filePath for branch='${branchName}', returning empty`);
    return {};
  }

  const cached = contextCache.getWithFileHash(branchName, filePath);
  if (cached) {
    logger.info(
      `[loadBranchContext] ✅ CACHE HIT for ${branchName}, changedFiles length=${cached.changedFiles?.length ?? 'null'}`,
    );
    return cached;
  }

  logger.info(`[loadBranchContext] ⚡ CACHE MISS - parsing ${branchName}`);
  const context = loadBranchContextFromFile(workspace, branchName);
  logger.info(`[loadBranchContext] Loaded context, changedFiles length=${context.changedFiles?.length ?? 'null'}`);
  contextCache.setWithFileHash(branchName, context, filePath);
  return context;
};

export const invalidateBranchContextCache = (branchName: string) => {
  logger.info(`[invalidateBranchContextCache] Invalidating cache for ${branchName}`);
  contextCache.invalidate(branchName);
};

export const updateBranchContextCache = (branchName: string, context: BranchContext, markdownContent: string) => {
  const contentHash = generateHashForFileContent(markdownContent);

  logger.info(
    `[updateBranchContextCache] Updating cache for ${branchName} (hash: ${contentHash.substring(0, 8)}..., content: ${markdownContent.length} bytes)`,
  );
  contextCache.set(branchName, context, contentHash);
  logger.info(`[updateBranchContextCache] ✅ Cache updated successfully for ${branchName}`);
};
