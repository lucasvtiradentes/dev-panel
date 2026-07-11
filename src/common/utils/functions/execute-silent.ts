import { VscodeConstants } from '../../vscode/vscode-constants';
import { ToastKind, VscodeHelper } from '../../vscode/vscode-helper';
import { TypeGuardsHelper } from '../helpers/type-guards-helper';
import { execAsync } from './exec-async';

type ExecuteTaskSilentlyOptions = {
  command: string;
  cwd: string;
  env: Record<string, string>;
  taskName: string;
  customNotification?: boolean;
  itemKind?: 'Action' | 'Task';
};

export async function executeTaskSilently(options: ExecuteTaskSilentlyOptions) {
  const { command, cwd, env, taskName, customNotification = false, itemKind = 'Task' } = options;

  await VscodeHelper.withProgress(
    {
      location: VscodeConstants.ProgressLocation.Notification,
      title: `Running: ${taskName}`,
      cancellable: false,
    },
    async () => {
      try {
        const result = await execAsync(command, { cwd, env: { ...process.env, ...env } });
        if (customNotification) {
          const message = getLastNonEmptyLine(result.stdout) ?? `${itemKind} "${taskName}" completed`;
          void VscodeHelper.showToastMessage(ToastKind.Info, message);
        }
      } catch (error: unknown) {
        const defaultMessage = TypeGuardsHelper.getErrorMessage(error);
        const customMessage = getErrorOutput(error) ?? `${itemKind} "${taskName}" failed`;
        const message = customNotification ? customMessage : `${itemKind} "${taskName}" failed: ${defaultMessage}`;
        void VscodeHelper.showToastMessage(ToastKind.Error, message);
      }
    },
  );
}

function getErrorOutput(error: unknown): string | null {
  if (!TypeGuardsHelper.isObjectWithProperty(error, 'stderr')) return null;
  return typeof error.stderr === 'string' ? getLastNonEmptyLine(error.stderr) : null;
}

function getLastNonEmptyLine(output: string): string | null {
  const lines = output.trim().split('\n');
  return (
    lines
      .reverse()
      .find((line) => line.trim())
      ?.trim() ?? null
  );
}
