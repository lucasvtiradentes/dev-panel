import { ConfigManager } from '../../../common/core/config-manager';
import { createLogger } from '../../../common/lib/logger';
import { execAsync } from '../../../common/utils/functions/exec-async';
import { JsonHelper } from '../../../common/utils/helpers/json-helper';
import { FileIOHelper } from '../../../common/utils/helpers/node-helper';
import { TypeGuardsHelper } from '../../../common/utils/helpers/type-guards-helper';
import { extractAllFieldsRaw } from '../storage/file-storage';
import type { AutoSectionProvider, SyncContext } from './interfaces';

const logger = createLogger('PluginLoader');

const PLUGIN_TIMEOUT = 60000;

export function loadAutoProvider(workspace: string, providerCommand: string): AutoSectionProvider {
  const configDir = ConfigManager.getConfigDirPathFromWorkspacePath(workspace);
  logger.info(`[loadAutoProvider] Provider command: ${providerCommand}`);

  return {
    async fetch(context: SyncContext): Promise<string> {
      let fields: Record<string, string> = {};
      if (context.markdownPath) {
        const markdownContent = FileIOHelper.readFileIfExists(context.markdownPath);
        if (markdownContent) {
          fields = extractAllFieldsRaw(markdownContent);
        }
      }

      const contextJson = JsonHelper.stringify({
        ...context,
        fields,
      });

      logger.info(`[loadAutoProvider] Running: ${providerCommand}`);

      try {
        const { stdout } = await execAsync(providerCommand, {
          timeout: PLUGIN_TIMEOUT,
          cwd: configDir,
          env: {
            ...process.env,
            PLUGIN_CONTEXT: contextJson,
          },
        });

        return stdout.trim();
      } catch (error: unknown) {
        logger.error(`[loadAutoProvider] Script error: ${TypeGuardsHelper.getErrorMessage(error)}`);
        throw error;
      }
    },
  };
}
