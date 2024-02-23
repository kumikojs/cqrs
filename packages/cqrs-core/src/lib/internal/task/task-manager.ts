/* eslint-disable @typescript-eslint/no-explicit-any */

import { DeduplicationStrategy } from '../../strategy/deduplication-strategy';

export interface TaskManagerContract<TRequest, TTask> {
  execute<TResult>(request: TRequest, task: TTask): Promise<TResult>;
}

export abstract class TaskManager<
  TRequest,
  TTask extends (request: TRequest) => Promise<any>
> implements TaskManagerContract<TRequest, TTask>
{
  #deduplicationStrategy: DeduplicationStrategy;

  constructor() {
    this.#deduplicationStrategy = new DeduplicationStrategy({
      serialize: this.serialize.bind(this),
    });
  }

  async execute<TResult>(request: TRequest, task: TTask): Promise<TResult> {
    return this.#deduplicationStrategy.execute(request, task);
  }

  protected abstract serialize(request: TRequest): string;
}
