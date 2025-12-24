import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { getConfigDirPathFromWorkspacePath } from '../../../common/lib/config-manager';
import { createLogger } from '../../../common/lib/logger';
import type { AutoSectionProvider, SyncContext, TaskSyncProvider } from './interfaces';

const execAsync = promisify(exec);
const logger = createLogger('PluginLoader');

export function loadAutoProvider(workspace: string, providerCommand: string): AutoSectionProvider {
  const configDir = getConfigDirPathFromWorkspacePath(workspace);
  logger.info(`[loadAutoProvider] Provider command: ${providerCommand}`);

  return {
    async fetch(context: SyncContext): Promise<string> {
      const contextJson = JSON.stringify({
        branchName: context.branchName,
        workspacePath: context.workspacePath,
        markdownPath: context.markdownPath,
        branchContext: context.branchContext,
        sectionOptions: context.sectionOptions,
      });

      logger.info(`[loadAutoProvider] Running: ${providerCommand}`);

      try {
        const { stdout } = await execAsync(providerCommand, {
          encoding: 'utf-8',
          timeout: 60000,
          cwd: configDir,
          env: {
            ...process.env,
            PLUGIN_CONTEXT: contextJson,
          },
        });

        return stdout.trim();
      } catch (error) {
        logger.error(`[loadAutoProvider] Script error: ${error}`);
        throw error;
      }
    },
  };
}

export function loadTaskProvider(_workspace: string, _providerCommand: string): TaskSyncProvider {
  throw new Error('Custom task providers not yet implemented');
}
