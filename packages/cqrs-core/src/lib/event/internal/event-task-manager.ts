import { TaskManager } from '../../internal/task/task-manager';
import type { EventContract } from '../event';
import type { EventHandlerContract } from '../event-handler';

export class EventTaskManager extends TaskManager<
  EventContract,
  EventHandlerContract['execute']
> {
  protected serialize(request: EventContract) {
    return JSON.stringify({
      name: request.eventName,
      payload: request.payload,
    });
  }
}
