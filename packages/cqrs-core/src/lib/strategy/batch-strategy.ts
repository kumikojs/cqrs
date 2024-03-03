import { ttlToMilliseconds } from '../internal/ttl/ttl';
import { Strategy } from './internal/strategy';

import type { TTL } from '../internal/ttl/ttl';
import type { PromiseAnyFunction } from '../internal/types';

export type BatchOptions = Readonly<{
  maxBatchSize: number;
  maxWaitTime: TTL;
}>;

export class BatchException extends Error {
  public constructor(error: unknown) {
    super(`Batch failed with error: ${error}`);
  }
}

export class BatchStrategy extends Strategy<BatchOptions> {
  #batch: PromiseAnyFunction[] = [];
  #timer: NodeJS.Timeout | undefined;

  constructor(options?: Partial<BatchOptions>) {
    super({
      maxBatchSize: 10,
      maxWaitTime: '10ms',
      ...options,
    });
  }

  public async execute<TRequest, TTask extends PromiseAnyFunction, TResult>(
    request: TRequest,
    task: TTask
  ): Promise<TResult> {
    const promise = new Promise<TResult>((resolve, reject) => {
      this.#batch.push(async () => {
        try {
          const result = await task(request);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (this.#batch.length >= this.options.maxBatchSize) {
        this.#flush();
      }
    });

    if (!this.#timer) {
      this.#timer = setTimeout(
        () => this.#flush(),
        ttlToMilliseconds(this.options.maxWaitTime)
      );
    }

    return promise;
  }

  #flush() {
    if (this.#batch.length === 0) {
      return;
    }

    const batch = this.#batch;
    this.#batch = [];
    this.#timer = undefined;

    Promise.all(batch.map((task) => task())).catch((error) => {
      throw new BatchException(error);
    });
  }
}
