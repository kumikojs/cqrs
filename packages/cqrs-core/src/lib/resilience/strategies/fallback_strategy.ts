/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from './base_strategy';

import type { AsyncFunction } from '../../types';

/**
 * Configuration options for defining fallback behavior in case of task failures.
 */
export type FallbackOptions = {
  /**
   * A function to be invoked when the primary task execution encounters an error.
   * This function receives the original request and the encountered error,
   * allowing for custom fallback logic and potential error handling.
   *
   * @param request - The request data used for the task execution.
   * @param error - The error object thrown by the failing task.
   * @returns The fallback result value.
   */
  fallback: <TRequest>(request: TRequest, error: unknown) => any;
};

/**
 * A strategy designed to provide a fallback mechanism when the primary task fails.
 * If the task execution throws an error, the configured fallback function
 * will be executed to provide a substitute result or handle the error appropriately.
 *
 *  @example
 * ```ts
 * const fallback = (request: any, error: unknown) => {
 *    console.error(error);
 *    return 'fallback';
 * };
 *
 * const strategy = new FallbackStrategy({ fallback });
 *
 * const result = await strategy.execute({}, () => {
 *    throw new Error('error');
 * });
 *
 * console.log(result); // 'fallback'
 * ```
 */
export class FallbackStrategy extends Strategy<FallbackOptions> {
  /**
   * Executes a task with fallback handling.
   *
   * If the provided task throws an error, the configured fallback function
   * is invoked with the request data and the encountered error. The fallback
   * function's return value becomes the result of the strategy execution.
   *
   * @template TRequest - The type of request data used for the task.
   * @template TTask - The type of the task to be executed, constrained to be an async function.
   * @template TResult - The type representing the expected result of the task execution
   *                    or the return type of the fallback function.
   *
   * @param request - The request data to be passed to the task.
   * @param task - The async function representing the task to be executed.
   * @returns A promise that resolves with either the task's result or the fallback result.
   */
  async execute<
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
