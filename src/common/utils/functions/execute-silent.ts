import { VscodeConstants } from '../../vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../../vscode/vscode-helper';
import { TypeGuardsHelper } from '../helpers/type-guards-helper';
import { execAsync } from './exec-async';

type ExecuteTaskSilentlyOptions = {
  command: string;
  cwd: string;
  env: Record<string, string>;
  taskName: string;
};

export async function executeTaskSilently(options: ExecuteTaskSilentlyOptions) {
  const { command, cwd, env, taskName } = options;

  await VscodeHelper.withProgress(
    {
      location: VscodeConstants.ProgressLocation.Notification,
      title: `Running: ${taskName}`,
      cancellable: false,
    },
    async () => {
      try {
        await execAsync(command, { cwd, env: { ...process.env, ...env } });
      } catch (error: unknown) {
        void VscodeHelper.showToastMessage(
          ToastKind.Error,
          `Task "${taskName}" failed: ${TypeGuardsHelper.getErrorMessage(error)}`,
        );
      }
    },
  );
}
