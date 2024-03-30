/* eslint-disable @typescript-eslint/no-explicit-any */
import { ms } from '../../internal/ms/ms';
import { Strategy } from './base_strategy';

import type { AsyncFunction, DurationUnit } from '../../types';

/**
 * Configuration options for customizing the retry behavior of the strategy.
 */
export type RetryOptions = {
  /**
   * The maximum number of attempts to execute the task before giving up.
   * Defaults to 3 retries.
   *
   * @default 3
   * @type {number}
   */
  maxAttempts: number;

  /**
   * The delay between retry attempts in a duration format.
   * Supports various units like milliseconds ('ms'), seconds ('s'), minutes ('m'), etc.
   * Defaults to '1s' (one second).
   *
   * @default '1s'
   * @see {@link DurationUnit}
   * @type {DurationUnit}
   * @example
   * '500ms' // 500 milliseconds
   * '30s' // 30 seconds
   * '5m' // 5 minutes
   */
  delay: DurationUnit;

  /**
   * An array of error types (or classes) that should immediately cause the strategy
   * to abandon retries and throw the encountered error. Any other error type
   * will be retried up to the configured `maxAttempts`.
   *
   * @type {any[]}
   * @example
   * [MyCustomError, NetworkError] // These errors will not be retried.
   */
  shouldNotRetryErrors: any[];
};

/**
 * A strategy designed to handle task failures gracefully by retrying the task
 * up to a specified number of attempts with increasing delays between attempts.
 *
 * @example
 * ```ts
 * let counter = 0;
 * const throwError = () => {
 *    counter += 1;
 *    if (counter < 3) {
 *        throw new Error('error');
 *    }
 *    return counter;
 * };
 *
 * const strategy = new RetryStrategy();
 *
 * const result = await strategy.execute({}, throwError);
 *
 * console.log(result); // 3
 * ```
 */
export class RetryStrategy extends Strategy<RetryOptions> {
  /**
   * Default configuration options for the retry strategy.
   * @private
   * @static
   */
  static #defaultOptions: RetryOptions = {
    maxAttempts: 3,
    delay: '1s',
    shouldNotRetryErrors: [],
  };

  /**
   * Creates an instance of the retry strategy.
   *
   * @param options - The options for the retry strategy.
   */
  public constructor(options?: Partial<RetryOptions>) {
    super({
      ...RetryStrategy.#defaultOptions,
      ...options,
    });
  }

  /**
   * Executes a task with a retry mechanism.
   *
   * If the task fails, it will be retried up to the configured maximum number
   * of attempts. The delay between retries increases exponentially with each attempt.
   * Errors specified in the `shouldNotRetryErrors` option will be thrown immediately
   * without retries.
   *
   * @template TRequest - The type of request data used for the task.
   * @template TTask - The type of the task to be executed, constrained to be an async function.
   * @template TResult - The expected type of the result produced by the task execution.
   *
   * @param request - The request data to be passed to the task.
   * @param task - The async function representing the task to be executed.
   * @returns A promise that resolves with the task's result upon successful execution.
   * @throws {any} The error thrown by the last attempt if retries are exhausted.
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

  /**
   * Determines whether to retry the task based on the encountered error.
   *
   * This method checks the configured `shouldNotRetryErrors` list to see if the
   * encountered error is one that should be thrown immediately without retries.
   * If `shouldNotRetryErrors` is empty (no configured errors), all errors will be retried.
   * Otherwise, the method iterates through the list and checks if the error is an
   * instance of any of the listed error classes. If a match is found, the error is
   * considered non-retryable.
   *
   * @param error - The error thrown by the task execution attempt.
   * @returns `true` if the error is eligible for retry, `false` otherwise.
   */
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
   * Introduces a delay for backoff strategy between retry attempts.
   *
   * Calculates the backoff delay based on the number of attempts (`attempts`)
   * and the configured delay between retries (`delay`). The delay increases
   * exponentially with each attempt. The method utilizes a Promise to achieve
   * the asynchronous delay.
   *
   * @param attempts - The number of attempts made so far.
   * @param delay - The configured delay between retry attempts (in milliseconds).
   * @returns A promise that resolves after the calculated backoff delay.
   */
  async #delayForBackoff(attempts: number, delay: number): Promise<void> {
    const backoffDelay = delay * attempts;
    await new Promise((resolve) => setTimeout(resolve, backoffDelay));
  }
}
