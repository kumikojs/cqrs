/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PromiseAnyFunction } from '../internal/types';
import { type TTL, ttlToMilliseconds } from '../utils/ttl';
import { Strategy } from './internal/strategy';

export type RetryOptions = {
  /**
   * The maximum number of retries.
   * @default 3
   * @type {number}
   */
  maxRetries: number;

  /**
   * The delay between retries.
   * @default '1s'
   * @see {@link TTL}
   * @type {TTL}
   * @example
   * '500ms' // 500 milliseconds
   * '30s' // 30 seconds
   * '5m' // 5 minutes
   */
  delay: TTL;
};

export class RetryStrategy extends Strategy<RetryOptions> {
  static #defaultOptions: RetryOptions = {
    maxRetries: 3,
    delay: '1s',
  };

  public constructor(options?: Partial<RetryOptions>) {
    super({
      ...RetryStrategy.#defaultOptions,
      ...options,
    });
  }

  public async execute<TRequest, TTask extends PromiseAnyFunction, TResult>(
    request: TRequest,
    task: TTask
  ): Promise<TResult> {
    const { maxRetries, delay } = this.options;

    let retries = 0;
    let lastError: any;

    while (retries <= maxRetries) {
      try {
        const result = await task(request);
        return result;
      } catch (error) {
        retries++;
        lastError = error;
        await this.delayForBackoff(retries, ttlToMilliseconds(delay));
      }
    }

    throw lastError;
  }

  private async delayForBackoff(retries: number, delay: number): Promise<void> {
    const backoffDelay = delay * retries;
    await new Promise((resolve) => setTimeout(resolve, backoffDelay));
  }
}
