import { TaskManager } from '../../internal/task/task-manager';
import type { CommandContract } from '../command';
import type { CommandHandlerContract } from '../command-handler';

export class CommandTaskManager extends TaskManager<
  CommandContract,
  CommandHandlerContract['execute']
> {
  protected serialize(request: CommandContract) {
    return JSON.stringify({
      name: request.commandName,
      payload: request.payload,
    });
  }
}
