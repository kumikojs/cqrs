/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PromiseAnyFunction } from '../internal/types';
import { Strategy } from './internal/strategy';

type RetryOptions = {
  maxRetries: number;
  delay: number;
};

export class RetryStrategy extends Strategy<RetryOptions> {
  public constructor(options?: RetryOptions) {
    super({
      maxRetries: options?.maxRetries ?? 3,
      delay: options?.delay ?? 1000,
    });
  }

  public async execute<TRequest, TTask extends PromiseAnyFunction, TResult>(
    request: TRequest,
    task: TTask
  ): Promise<TResult> {
    const { maxRetries, delay } = this.options;

    let retries = 0;
    let lastError: any;

    while (retries < maxRetries) {
      try {
        const result = await task(request);
        return result;
      } catch (error) {
        retries++;
        lastError = error;
        await this.delayForBackoff(retries, delay);
      }
    }

    throw lastError;
  }

  private async delayForBackoff(retries: number, delay: number): Promise<void> {
    const backoffDelay = delay * retries;
    await new Promise((resolve) => setTimeout(resolve, backoffDelay));
  }
}
