/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from './base_strategy';

import type { DeduplicationOptions } from '../../../types/core/options/resilience_options';
import type { AsyncFunction } from '../../../types/helpers';

/**
 * A strategy that optimizes task execution by eliminating redundant requests,
 * ensuring only one execution occurs for a given unique request.
 *
 * This strategy utilizes a serialization function to convert the request object
 * into a unique string identifier. Requests with identical identifiers are considered
 * duplicates and only the first execution is carried out. Subsequent requests
 * with the same identifier will wait for the first execution to complete and
 * then return the same result.
 *
 * @example
 * ```typescript
 * // Define a serialization function that converts the request object to a string
 * const serialize = (request: { id: number }) => JSON.stringify(request);
 *
 * // Create a new DeduplicationStrategy instance with the custom serialization function
 * const strategy = new DeduplicationStrategy({ serialize });
 *
 * // Define a function that fetches a user by ID using the strategy
 * const fetchUser = async (id: number) => {
 *   // Execute the task using the strategy, passing the request object (containing the ID)
 *   // and the actual fetching function (fetch)
 *   return strategy.execute({ id }, fetch);
 * };
 *
 * // Simulate concurrent requests from different components
 * const startTime = new Date('2024-03-31T22:00:00');
 * console.log(`Running at ${startTime.toLocaleTimeString()}`);
 *
 * // Run fetchUser with ID 1 (first component)
 * const promise1 = fetchUser(1);
 *
 * // Simulate a slight delay for the second component (10 seconds)
 * setTimeout(async () => {
 *   console.log(`Running at ${(new Date()).toLocaleTimeString()}`);
 *   const promise2 = await fetchUser(1); // waits for the first execution
 *   console.log('Result from second component:', promise2);
 * }, 10000);
 *
 * // Wait for both promises to finish
 * const result1 = await promise1;
 * console.log('Result from first component:', result1);
 *
 * // Both components will receive the same result (1) since the request was deduplicated.
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
