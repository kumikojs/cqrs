/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from './base_strategy';

import type { DeduplicationOptions } from '../../../types/core/options/resilience_options';
import type { AsyncFunction } from '../../../types/helpers';

export class DeduplicationStrategy extends Strategy<DeduplicationOptions> {
  #pendingTasks = new Map<string, Promise<any>>();

  constructor(options: DeduplicationOptions) {
    super(options);
  }

  async execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    const taskKey = this.options.serialize(request);

    if (this.#pendingTasks.has(taskKey)) {
      return this.#pendingTasks.get(taskKey) as Promise<TResult>;
    }

    const taskPromise = task(request);
    this.#pendingTasks.set(taskKey, taskPromise);

    try {
      return await taskPromise;
    } finally {
      this.#pendingTasks.delete(taskKey);
    }
  }
}
