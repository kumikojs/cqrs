/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from './base_strategy';

import type { AsyncFunction } from '../../types';

/**
 * Configuration options for customizing request deduplication behavior.
 */
export type DeduplicationOptions = {
  /**
   * Serializes a request into a unique string representation for deduplication purposes.
   *
   * @param request - The request to serialize.
   * @returns A string key used for tracking pending requests.
   */
  serialize: (request: any) => string;
};

/**
 * A strategy that optimizes task execution by eliminating redundant requests,
 * ensuring only one execution occurs for a given unique request.
 *
 *  @example
 * ```ts
 * let counter = 0;
 * const task = async () => {
 *    counter += 1;
 *    return counter;
 * };
 *
 * const serialize = (request: any) => JSON.stringify(request);
 * const strategy = new DeduplicationStrategy({ serialize });
 *
 * const results = await Promise.all([
 *    strategy.execute({ id: 1 }, task),
 *    strategy.execute({ id: 1 }, task),
 *    strategy.execute({ id: 1 }, task),
 *    strategy.execute({ id: 2 }, task),
 *    strategy.execute({ id: 2 }, task),
 *    strategy.execute({ id: 3 }, task),
 * ]);
 *
 * console.log(results); // [1, 1, 1, 2, 2, 3]
 * ```
 */
export class DeduplicationStrategy extends Strategy<DeduplicationOptions> {
  /**
   * Stores a mapping of pending task keys to their respective Promises,
   * preventing multiple executions for identical requests.
   * @private
   */
  #pendingTasks = new Map<string, Promise<any>>();

  /**
   * Creates an instance of the deduplication strategy.
   *
   * @param options - The options for the deduplication strategy.
   */
  constructor(options: DeduplicationOptions) {
    super(options);
  }

  /**
   * Executes a task with deduplication logic.
   *
   * Checks for pending requests with matching keys and returns the existing
   * Promise if found, ensuring only a single execution per unique request.
   *
   * @template TRequest - The type of request data used for the task.
   * @template TTask - The type of the task to be executed, constrained to be an async function.
   * @template TResult - The expected type of the result produced by the task execution.
   *
   * @param request - The request data to be passed to the task.
   * @param task - The async function representing the task to be executed.
   * @returns A promise that resolves with the result of the task execution,
   *          ensuring only a single execution for identical requests.
   */
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
