import { LOG_FILE_PATH } from '../../common/lib/logger';
import { TypeGuards } from '../../common/utils/type-utils';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';
import { Command, registerCommand } from '../../common/vscode/vscode-utils';

export function createShowLogsCommand() {
  return registerCommand(Command.ShowLogs, async () => {
    try {
      await VscodeHelper.openDocument(VscodeHelper.createFileUri(LOG_FILE_PATH), { preview: false });
    } catch (error: unknown) {
      VscodeHelper.showToastMessage(ToastKind.Error, `Failed to open logs: ${TypeGuards.getErrorMessage(error)}`);
    }
  });
}
