import { TaskManager } from '../../internal/task/task-manager';
import type { QueryContract } from '../query';
import type { QueryHandlerContract } from '../query-handler';

export class QueryTaskManager extends TaskManager<
  QueryContract,
  QueryHandlerContract['execute']
> {
  protected serialize(request: QueryContract) {
    return JSON.stringify({
      name: request.queryName,
      payload: request.payload,
    });
  }
}
