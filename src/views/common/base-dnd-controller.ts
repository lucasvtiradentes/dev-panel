import * as vscode from 'vscode';
import type { NamedTreeItem, SimpleStateManager, StateManager } from './types';

export class BaseDragAndDropController<TItem extends NamedTreeItem, TSource = void>
  implements vscode.TreeDragAndDropController<TItem>
{
  readonly dropMimeTypes: string[];
  readonly dragMimeTypes: string[];

  constructor(
    private readonly mimeType: string,
    private readonly stateManager: StateManager<TSource> | SimpleStateManager,
    private readonly getIsGrouped: () => boolean,
    private readonly getSource: (() => TSource) | null,
    private readonly onReorder: () => void,
  ) {
    this.dropMimeTypes = [mimeType];
    this.dragMimeTypes = [mimeType];
  }

  handleDrag(source: readonly TItem[], dataTransfer: vscode.DataTransfer, _token: vscode.CancellationToken): void {
    const item = source[0];
    if (!item) return;

    const label = this.getItemLabel(item);
    dataTransfer.set(this.mimeType, new vscode.DataTransferItem(label));
  }

  handleDrop(target: TItem | undefined, dataTransfer: vscode.DataTransfer, _token: vscode.CancellationToken): void {
    const transferItem = dataTransfer.get(this.mimeType);
    if (!transferItem || !target) return;

    const draggedLabel = transferItem.value as string;
    const targetLabel = this.getItemLabel(target);

    if (draggedLabel === targetLabel) return;

    this.reorderItems(draggedLabel, targetLabel);
    this.onReorder();
  }

  private getItemLabel(item: TItem): string {
    return typeof item.label === 'string' ? item.label : (item.label?.label ?? '');
  }

  private reorderItems(draggedLabel: string, targetLabel: string): void {
    const isGrouped = this.getIsGrouped();
    const source = this.getSource ? this.getSource() : (undefined as TSource);

    const currentOrder = this.isSimpleStateManager(this.stateManager)
      ? this.stateManager.getOrder(isGrouped)
      : this.stateManager.getOrder(source, isGrouped);

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

    if (this.isSimpleStateManager(this.stateManager)) {
      this.stateManager.saveOrder(isGrouped, order);
    } else {
      this.stateManager.saveOrder(source, isGrouped, order);
    }
  }

  private isSimpleStateManager(manager: StateManager<TSource> | SimpleStateManager): manager is SimpleStateManager {
    return this.getSource === null;
  }
}

export function createDragAndDropController<TItem extends NamedTreeItem>(
  mimeType: string,
  stateManager: SimpleStateManager,
  getIsGrouped: () => boolean,
  onReorder: () => void,
) {
  return new BaseDragAndDropController<TItem, void>(mimeType, stateManager, getIsGrouped, null, onReorder);
}

export function createSourcedDragAndDropController<TItem extends NamedTreeItem, TSource>(
  mimeType: string,
  stateManager: StateManager<TSource>,
  getIsGrouped: () => boolean,
  getSource: () => TSource,
  onReorder: () => void,
): BaseDragAndDropController<TItem, TSource> {
  return new BaseDragAndDropController(mimeType, stateManager, getIsGrouped, getSource, onReorder);
}
