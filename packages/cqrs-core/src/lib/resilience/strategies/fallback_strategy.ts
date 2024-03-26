/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from './base_strategy';

import type { AsyncFunction } from '../../types';

/**
 * The options for the fallback strategy.
 */
export type FallbackOptions = {
  /**
   * The fallback function to be executed when the task fails.
   */
  fallback: <TRequest>(request: TRequest, error: unknown) => any;
};

/**
 * The fallback strategy.
 * This strategy will execute the fallback function when the task fails.
 */
export class FallbackStrategy extends Strategy<FallbackOptions> {
  /**
   * Execute the task with a fallback.
   *
   * If the task fails, the fallback function will be executed.
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
    try {
      return await task(request);
    } catch (error) {
      return this.options.fallback(request, error);
    }
  }
}
