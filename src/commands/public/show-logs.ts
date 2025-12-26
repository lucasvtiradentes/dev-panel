import * as vscode from 'vscode';
import { LOG_FILE_PATH } from '../../common/lib/logger';
import { Command, registerCommand } from '../../common/lib/vscode-utils';
import { TypeGuards } from '../../common/utils/type-utils';
import { ToastKind, VscodeHelper } from '../../common/vscode/vscode-helper';

export function createShowLogsCommand() {
  return registerCommand(Command.ShowLogs, async () => {
    try {
      await VscodeHelper.openDocument(vscode.Uri.file(LOG_FILE_PATH), { preview: false });
    } catch (error: unknown) {
      VscodeHelper.showToastMessage(ToastKind.Error, `Failed to open logs: ${TypeGuards.getErrorMessage(error)}`);
    }
  });
}
