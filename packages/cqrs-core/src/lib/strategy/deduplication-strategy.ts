/* eslint-disable @typescript-eslint/no-explicit-any */

import type { PromiseAnyFunction } from '../internal/types';
import { Strategy } from './internal/strategy';

export type DeduplicationOptions = {
  /**
   * The function to serialize the request.
   * It should return a string that represents the key used when caching the request.
   */
  serialize: (request: any) => string;
};

export class DeduplicationStrategy extends Strategy<DeduplicationOptions> {
  #pendingTasks = new Map<string, Promise<any>>();

  public constructor(options: DeduplicationOptions) {
    super(options);
  }

  public async execute<
    TRequest,
    TTask extends PromiseAnyFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    const taskKey = this.options.serialize(request);

    if (this.#pendingTasks.has(taskKey)) {
      return this.#pendingTasks.get(taskKey);
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
