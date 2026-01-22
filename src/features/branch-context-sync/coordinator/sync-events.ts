import type { Disposable } from '../../../common/vscode/vscode-types';
import type { SyncEvent, SyncEventPayload } from '../types';

type EventHandler<T = unknown> = (data: T) => void;

export class SyncEventEmitter {
  private handlers = new Map<SyncEvent, Set<EventHandler>>();

  on<E extends SyncEvent>(
    event: E,
    handler: EventHandler<Extract<SyncEventPayload, { event: E }>['data']>,
  ): Disposable {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const eventHandlers = this.handlers.get(event)!;
    eventHandlers.add(handler as EventHandler);

    return {
      dispose: () => {
        eventHandlers.delete(handler as EventHandler);
      },
    };
  }

  emit<E extends SyncEvent>(event: E, data: Extract<SyncEventPayload, { event: E }>['data']) {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        handler(data);
      }
    }
  }

  dispose() {
    this.handlers.clear();
  }
}
