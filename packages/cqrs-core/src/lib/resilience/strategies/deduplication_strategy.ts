/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from './base_strategy';

import type { AsyncFunction } from '../../types';

/**
 * The options for the deduplication strategy.
 */
export type DeduplicationOptions = {
  /**
   * The function to serialize the request.
   * It should return a string that represents the key used when caching the request.
   */
  serialize: (request: any) => string;
};

/**
 * The deduplication strategy.
 * This strategy will deduplicate the requests.
 * If the same request is made while the previous request is still pending, the previous request will be returned.
 */
export class DeduplicationStrategy extends Strategy<DeduplicationOptions> {
  /**
   * The pending tasks.
   * This is a map of the task key to the task promise.
   */
  #pendingTasks = new Map<string, Promise<any>>();

  public constructor(options: DeduplicationOptions) {
    super(options);
  }

  /**
   * Execute the task with deduplication.
   *
   * If the same request is made while the previous request is still pending,
   * the previous request will be returned.
   * Otherwise, the task will be executed and the result will be returned.
   *
   * @template TRequest - The type of request.
   * @template TTask - The type of task.
   * @template TResult - The type of result.
   * @param {TRequest} request - The request to execute the task with.
   * @param {TTask} task - The task to execute.
   * @returns {Promise<TResult>} The result of the task.
   */
  public async execute<
    TRequest,
    TTask extends AsyncFunction,
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
