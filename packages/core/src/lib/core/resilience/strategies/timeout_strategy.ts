import { ms } from '../../../utilities/ms/ms';
import { Strategy } from './base_strategy';
import { TimeoutException } from './exceptions/timeout_exception';

import type { TimeoutOptions } from '../../../types/core/options/resilience_options';
import type { AsyncFunction } from '../../../types/helpers';

/**
 * A strategy designed to enforce a timeout limit on task execution.
 * If the task takes longer than the specified timeout, a `TimeoutException` is thrown.
 *
 * @example
 * ```ts
 * const strategy = new TimeoutStrategy({ timeout: '1s' });
 * const task = () => new Promise((resolve) => setTimeout(() => resolve('done'), 2000));
 *
 * try {
 *    const result = await strategy.execute({}, task);
 * } catch (error) {
 *    console.error(error); // Task timed out after 1000ms
 * }
 * ```
 */
export class TimeoutStrategy extends Strategy<TimeoutOptions> {
  /**
   * Default options for the TimeoutStrategy.
   * @private
   * @static
   */
  static #defaultOptions: TimeoutOptions = {
    timeout: '30s',
  };

  /**
   * Creates an instance of the timeout strategy.
   *
   * @param options - The options for the timeout strategy.
   */
  public constructor(options?: Partial<TimeoutOptions>) {
    super({
      timeout: options?.timeout ?? TimeoutStrategy.#defaultOptions.timeout,
    });
  }

  /**
   * Executes the provided task with a timeout constraint.
   *
   * This method wraps the provided task within a Promise and sets a timer with the
   * configured timeout duration. If the task execution doesn't complete within the
   * timeout window, a `TimeoutException` is thrown, rejecting the promise. Otherwise,
   * the task's result is resolved through the promise. Finally, the timer is cleared
   * to prevent memory leaks.
   *
   * @template TRequest - The type of request object used for throttling identification.
   * @template TTask - The type of the task to be executed. Must be an asynchronous function.
   * @template TResult - The return type of the provided task (`TTask`).
   * @param request - The request object used for throttling identification (ignored in TimeoutStrategy).
   * @param task - The asynchronous task to be executed.
   * @returns A promise that resolves to the result of the executed task (`TResult`) or rejects with a `TimeoutException` if the task timed out.
   */
  public async execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    const timeout = ms(this.options.timeout);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutException(timeout));
      }, timeout);

      task(request)
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }
}
