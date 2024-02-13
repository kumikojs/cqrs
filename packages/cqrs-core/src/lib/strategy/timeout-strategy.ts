import type { PromiseAnyFunction } from '../internal/types';
import { type TTL, ttlToMilliseconds } from '../utils/ttl';
import { Strategy } from './internal/strategy';

type TimeoutOptions = {
  timeout: TTL;
};

export class TimeoutStrategy extends Strategy<TimeoutOptions> {
  public constructor(options: TimeoutOptions) {
    super(options);
  }

  public async execute<TRequest, TTask extends PromiseAnyFunction, TResult>(
    request: TRequest,
    task: TTask
  ): Promise<TResult> {
    const timeout = ttlToMilliseconds(this.options.timeout);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Task timed out after ${timeout}ms`));
      }, timeout);

      task(request)
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }
}
