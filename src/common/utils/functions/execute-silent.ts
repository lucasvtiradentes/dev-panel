import { VscodeConstants } from '../../vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../../vscode/vscode-helper';
import { TypeGuardsHelper } from '../helpers/type-guards-helper';
import { execAsync } from './exec-async';

type ExecuteWithProgressOptions = {
  command: string;
  cwd: string;
  env?: Record<string, string>;
  title: string;
  onSuccess?: () => void | Promise<void>;
  onError?: (error: unknown) => void;
};

export async function executeCommandWithProgress(options: ExecuteWithProgressOptions) {
  const { command, cwd, env, title, onSuccess, onError } = options;

  await VscodeHelper.withProgress(
    {
      location: VscodeConstants.ProgressLocation.Notification,
      title,
      cancellable: false,
    },
    async () => {
      try {
        await execAsync(command, { cwd, env: { ...process.env, ...env } });
        if (onSuccess) await onSuccess();
      } catch (error: unknown) {
        if (onError) {
          onError(error);
        } else {
          void VscodeHelper.showToastMessage(ToastKind.Error, `Failed: ${TypeGuardsHelper.getErrorMessage(error)}`);
        }
      }
    },
  );
}

type ExecuteTaskSilentlyOptions = {
  command: string;
  cwd: string;
  env: Record<string, string>;
  taskName: string;
};

export async function executeTaskSilently(options: ExecuteTaskSilentlyOptions) {
  const { command, cwd, env, taskName } = options;

  await executeCommandWithProgress({
    command,
    cwd,
    env,
    title: `Running: ${taskName}`,
    onError: (error) => {
      void VscodeHelper.showToastMessage(
        ToastKind.Error,
        `Task "${taskName}" failed: ${TypeGuardsHelper.getErrorMessage(error)}`,
      );
    },
  });
}
