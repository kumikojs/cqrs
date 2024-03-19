import { ms } from '../internal/ms/ms';
import { Strategy } from './internal/strategy';

import type { DurationUnit } from '../internal/ms/ms';
import type { PromiseAnyFunction } from '../internal/types';

export type TimeoutOptions = {
  /**
   * The time to wait before timing out the task.
   * @default '30s'
   * @see {@link TTL}
   * @type {TTL}
   * @example
   * '500ms' // 500 milliseconds
   * '30s' // 30 seconds
   * '5m' // 5 minutes
   */
  timeout: DurationUnit;
};

export class TimeoutException extends Error {
  public constructor(timeout: number) {
    super(`Task timed out after ${timeout}ms`);
  }
}

export class TimeoutStrategy extends Strategy<TimeoutOptions> {
  static #defaultOptions: TimeoutOptions = {
    timeout: '30s',
  };

  public constructor(options?: Partial<TimeoutOptions>) {
    super({
      ...TimeoutStrategy.#defaultOptions,
      ...options,
    });
  }

  public async execute<
    TRequest,
    TTask extends PromiseAnyFunction,
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
