import * as vscode from 'vscode';
import type { VscodeColor, VscodeColorString, VscodeIcon, VscodeIconString } from './vscode-constants';
import type { ThemeIcon } from './vscode-types';

export class VscodeHelper {
  static createIcon(icon: VscodeIcon, color?: VscodeColor): ThemeIcon {
    return color ? new vscode.ThemeIcon(icon, new vscode.ThemeColor(color)) : new vscode.ThemeIcon(icon);
  }

  static createCustomIcon(icon: VscodeIconString, color?: VscodeColorString): ThemeIcon {
    return color ? new vscode.ThemeIcon(icon, new vscode.ThemeColor(color)) : new vscode.ThemeIcon(icon);
  }
}
