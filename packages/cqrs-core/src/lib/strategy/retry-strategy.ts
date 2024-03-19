/* eslint-disable @typescript-eslint/no-explicit-any */
import { ms } from '../internal/ms/ms';
import { Strategy } from './internal/strategy';

import type { DurationUnit } from '../internal/ms/ms';
import type { PromiseAnyFunction } from '../internal/types';

export type RetryOptions = {
  /**
   * The maximum number of attempts to retry the task.
   * @default 3
   * @type {number}
   */
  maxAttempts: number;

  /**
   * The delay between attempts.
   * @default '1s'
   * @see {@link TTL}
   * @type {TTL}
   * @example
   * '500ms' // 500 milliseconds
   * '30s' // 30 seconds
   * '5m' // 5 minutes
   */
  delay: DurationUnit;
};

export class RetryStrategy extends Strategy<RetryOptions> {
  static #defaultOptions: RetryOptions = {
    maxAttempts: 3,
    delay: '1s',
  };

  public constructor(options?: Partial<RetryOptions>) {
    super({
      ...RetryStrategy.#defaultOptions,
      ...options,
    });
  }

  public async execute<
    TRequest,
    TTask extends PromiseAnyFunction,
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
        await this.delayForBackoff(attempts, ms(delay));
      }
    }

    throw lastError;
  }

  private async delayForBackoff(
    attempts: number,
    delay: number
  ): Promise<void> {
    const backoffDelay = delay * attempts;
    await new Promise((resolve) => setTimeout(resolve, backoffDelay));
  }
}
