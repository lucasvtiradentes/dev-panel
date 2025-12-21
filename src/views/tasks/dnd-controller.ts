import { tasksState } from '../../common/lib/workspace-state';
import type { TaskSource } from '../../common/schemas/types';
import { createSourcedDragAndDropController } from '../common';
import type { TreeTask } from './items';

const MIME_TYPE = 'application/vnd.code.tree.projectpaneltasks';

export class TaskDragAndDropController {
  private controller: ReturnType<typeof createSourcedDragAndDropController<TreeTask, TaskSource>>;

  constructor(getCurrentSource: () => TaskSource, getIsGrouped: () => boolean, onReorder: () => void) {
    this.controller = createSourcedDragAndDropController<TreeTask, TaskSource>(
      MIME_TYPE,
      tasksState,
      getIsGrouped,
      getCurrentSource,
      onReorder,
    );
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
