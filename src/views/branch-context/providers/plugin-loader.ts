import * as fs from 'node:fs';
import * as path from 'node:path';
import { getConfigDirPathFromWorkspacePath } from '../../../common/lib/config-manager';
import { createLogger } from '../../../common/lib/logger';
import type { AutoSectionProvider, TaskSyncProvider } from './interfaces';

const logger = createLogger('PluginLoader');

export function loadAutoProvider(workspace: string, providerPath: string): AutoSectionProvider {
  const resolvedPath = resolveProviderPath(workspace, providerPath);
  logger.info(`[loadAutoProvider] Loading provider from: ${resolvedPath}`);

  if (!fs.existsSync(resolvedPath)) {
    logger.error(`[loadAutoProvider] Provider not found: ${resolvedPath}`);
    throw new Error(`Provider not found: ${resolvedPath}`);
  }

  try {
    delete require.cache[require.resolve(resolvedPath)];

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const provider = require(resolvedPath);
    const exported = provider.default ?? provider;

    validateAutoProvider(exported);
    logger.info(`[loadAutoProvider] Successfully loaded provider from: ${providerPath}`);

    return exported as AutoSectionProvider;
  } catch (error) {
    logger.error(`[loadAutoProvider] Failed to load provider: ${error}`);
    throw new Error(`Failed to load provider from ${providerPath}: ${error}`);
  }
}

export function loadTaskProvider(workspace: string, providerPath: string): TaskSyncProvider {
  const resolvedPath = resolveProviderPath(workspace, providerPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Provider not found: ${resolvedPath}`);
  }

  try {
    delete require.cache[require.resolve(resolvedPath)];

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const provider = require(resolvedPath);
    const exported = provider.default ?? provider;

    validateTaskProvider(exported);

    return exported as TaskSyncProvider;
  } catch (error) {
    throw new Error(`Failed to load provider from ${providerPath}: ${error}`);
  }
}

function resolveProviderPath(workspace: string, providerPath: string): string {
  const configDir = getConfigDirPathFromWorkspacePath(workspace);

  if (path.isAbsolute(providerPath)) {
    return providerPath;
  }

  return path.resolve(configDir, providerPath);
}

function validateAutoProvider(provider: unknown): void {
  if (!provider || typeof provider !== 'object') {
    throw new Error('AutoSectionProvider must be an object');
  }
  if (!('fetch' in provider) || typeof provider.fetch !== 'function') {
    throw new Error('AutoSectionProvider must implement fetch() method');
  }
}

function validateTaskProvider(provider: unknown): void {
  if (!provider || typeof provider !== 'object') {
    throw new Error('TaskSyncProvider must be an object');
  }

  const requiredMethods = ['fromMarkdown', 'toMarkdown', 'getTasks', 'onToggleTask', 'onCreateTask', 'onSync'];

  for (const method of requiredMethods) {
    if (!(method in provider) || typeof (provider as Record<string, unknown>)[method] !== 'function') {
      throw new Error(`TaskSyncProvider must implement ${method}() method`);
    }
  }
}
