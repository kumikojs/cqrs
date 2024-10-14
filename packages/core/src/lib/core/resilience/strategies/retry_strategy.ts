/* eslint-disable @typescript-eslint/no-explicit-any */
import { BusException } from '../../../infrastructure/bus/bus_exception';
import { ms } from '../../../utilities/ms/ms';
import { Strategy } from './base_strategy';

import type { RetryOptions } from '../../../types/core/options/resilience_options';
import type { AsyncFunction } from '../../../types/helpers';
import { AbortException } from '../../../infrastructure/middleware/exceptions/abort_exception';

export class RetryStrategy extends Strategy<RetryOptions> {
  static #defaultOptions: RetryOptions = {
    maxAttempts: 3,
    delay: '1s',
    shouldNotRetryErrors: [BusException, AbortException],
  };

  public constructor(options?: Partial<RetryOptions>) {
    super({
      ...RetryStrategy.#defaultOptions,
      ...options,
    });
  }

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
