/* eslint-disable @typescript-eslint/no-explicit-any */
import { ms } from '../../internal/ms/ms';
import { Strategy } from './base_strategy';

import type { DurationUnit } from '../../internal/ms/types';
import type { AsyncFunction } from '../../types';

/**
 * The options for the retry strategy.
 */
export type RetryOptions = {
  /**
   * The maximum number of attempts to retry the task.
   *
   * @default 3
   * @type {number}
   */
  maxAttempts: number;

  /**
   * The delay between attempts.
   *
   * @default '1s'
   * @see {@link TTL}
   * @type {TTL}
   * @example
   * '500ms' // 500 milliseconds
   * '30s' // 30 seconds
   * '5m' // 5 minutes
   */
  delay: DurationUnit;

  /**
   * The errors to throw immediately.
   *
   * @type {any[]}
   */
  shouldNotRetryErrors: any[];
};

/**
 * The retry strategy.
 * This strategy will retry the task when it fails.
 */
export class RetryStrategy extends Strategy<RetryOptions> {
  static #defaultOptions: RetryOptions = {
    maxAttempts: 3,
    delay: '1s',
    shouldNotRetryErrors: [],
  };

  public constructor(options?: Partial<RetryOptions>) {
    super({
      ...RetryStrategy.#defaultOptions,
      ...options,
    });
  }

  /**
   * Task execution with retries.
   *
   * If the task fails, it will be retried up to the maximum number of attempts.
   * The delay between attempts will increase with each attempt.
   *
   * @template TRequest - The type of request.
   * @template TTask - The type of task.
   * @template TResult - The type of result.
   * @param {TRequest} request - The request to execute the task with.
   * @param {TTask} task - The task to execute.
   * @returns {Promise<TResult>} The result of the task.
   * @throws {any} The error from the last attempt.
   */
  public async execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    const { maxAttempts, delay } = this.options;

    let attempts = 0;
    let lastError: any;

    while (attempts <= maxAttempts) {
      try {
        const result = await task(request);
        return result;
      } catch (error) {
        attempts++;
        lastError = error;

        if (!this.#shouldRetry(error)) {
          throw error;
        }

        await this.#delayForBackoff(attempts, ms(delay));
      }
    }

    throw lastError;
  }

  #shouldRetry(error: unknown): boolean {
    const { shouldNotRetryErrors } = this.options;

    if (!shouldNotRetryErrors) {
      return true;
    }

    return !shouldNotRetryErrors.some(
      (errorClass) => error instanceof errorClass
    );
  }

  /**
   * Delay for backoff.
   *
   * @param {number} attempts - The number of attempts.
   * @param {number} delay - The delay between attempts.
   * @returns {Promise<void>} A promise that resolves after the delay.
   */
  async #delayForBackoff(attempts: number, delay: number): Promise<void> {
    const backoffDelay = delay * attempts;
    await new Promise((resolve) => setTimeout(resolve, backoffDelay));
  }
}
