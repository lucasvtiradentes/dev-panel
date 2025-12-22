import { DND_MIME_TYPE_TASKS } from '../../common/constants';
import { tasksState } from '../../common/lib/workspace-state';
import type { TaskSource } from '../../common/schemas/types';
import { createSourcedDragAndDropController } from '../common';
import type { TreeTask } from './items';

export class TaskDragAndDropController {
  private controller: ReturnType<typeof createSourcedDragAndDropController<TreeTask, TaskSource>>;

  constructor(getCurrentSource: () => TaskSource, getIsGrouped: () => boolean, onReorder: () => void) {
    this.controller = createSourcedDragAndDropController<TreeTask, TaskSource>({
      mimeType: DND_MIME_TYPE_TASKS,
      stateManager: tasksState,
      getIsGrouped,
      getSource: getCurrentSource,
      onReorder,
    });
  }

  get dropMimeTypes() {
    return this.controller.dropMimeTypes;
  }

  get dragMimeTypes() {
    return this.controller.dragMimeTypes;
  }

  handleDrag(...args: Parameters<typeof this.controller.handleDrag>) {
    return this.controller.handleDrag(...args);
  }

  handleDrop(...args: Parameters<typeof this.controller.handleDrop>) {
    return this.controller.handleDrop(...args);
  }
}
