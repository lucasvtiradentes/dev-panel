import { ToastKind, VscodeHelper } from '../vscode/vscode-helper';

export class TreeItemUtils {
  static showInvalidItemError(itemType: string) {
    VscodeHelper.showToastMessage(ToastKind.Error, `Invalid ${itemType} selected`);
  }
}
