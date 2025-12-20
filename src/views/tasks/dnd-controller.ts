import * as vscode from 'vscode';
import type { TaskSource } from '../../common/schemas/types';
import type { GroupTreeItem, TreeTask, WorkspaceTreeItem } from './items';
import { getOrder, saveSourceOrder } from './state';

const MIME_TYPE = 'application/vnd.code.tree.betterprojecttoolstasks';

export class TaskDragAndDropController
  implements vscode.TreeDragAndDropController<TreeTask | GroupTreeItem | WorkspaceTreeItem>
{
  readonly dropMimeTypes = [MIME_TYPE];
  readonly dragMimeTypes = [MIME_TYPE];

  private _currentSource: () => TaskSource;
  private _isGrouped: () => boolean;
  private _onReorder: () => void;

  constructor(getCurrentSource: () => TaskSource, getIsGrouped: () => boolean, onReorder: () => void) {
    this._currentSource = getCurrentSource;
    this._isGrouped = getIsGrouped;
    this._onReorder = onReorder;
  }

  handleDrag(
    source: readonly (TreeTask | GroupTreeItem | WorkspaceTreeItem)[],
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): void {
    const item = source[0];
    if (!item) return;

    const label = typeof item.label === 'string' ? item.label : (item.label?.label ?? '');
    dataTransfer.set(MIME_TYPE, new vscode.DataTransferItem(label));
  }

  handleDrop(
    target: TreeTask | GroupTreeItem | WorkspaceTreeItem | undefined,
    dataTransfer: vscode.DataTransfer,
    _token: vscode.CancellationToken,
  ): void {
    const transferItem = dataTransfer.get(MIME_TYPE);
    if (!transferItem || !target) return;

    const draggedLabel = transferItem.value as string;
    const targetLabel = typeof target.label === 'string' ? target.label : (target.label?.label ?? '');

    if (draggedLabel === targetLabel) return;

    const source = this._currentSource();
    this.reorderItems(source, draggedLabel, targetLabel);
    this._onReorder();
  }

  private reorderItems(source: TaskSource, draggedLabel: string, targetLabel: string): void {
    const isGrouped = this._isGrouped();
    const currentOrder = getOrder(source, isGrouped);
    const order = [...currentOrder];

    const draggedIndex = order.indexOf(draggedLabel);
    const targetIndex = order.indexOf(targetLabel);

    if (draggedIndex === -1 && targetIndex === -1) {
      order.push(targetLabel);
      order.push(draggedLabel);
    } else if (draggedIndex === -1) {
      order.splice(targetIndex, 0, draggedLabel);
    } else if (targetIndex === -1) {
      order.splice(draggedIndex, 1);
      order.push(targetLabel);
      order.push(draggedLabel);
    } else {
      order.splice(draggedIndex, 1);
      order.splice(targetIndex, 0, draggedLabel);
    }

    saveSourceOrder(source, isGrouped, order);
  }
}
