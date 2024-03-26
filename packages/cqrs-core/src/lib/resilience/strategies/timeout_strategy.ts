import { ms } from '../../internal/ms/ms';
import { Strategy } from './base_strategy';

import type { DurationUnit } from '../../internal/ms/types';
import type { AsyncFunction } from '../../types';

/**
 * The timeout options.
 */
export type TimeoutOptions = {
  /**
   * The time to wait before timing out the task.
   *
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

/**
 * The timeout exception.
 */
export class TimeoutException extends Error {
  public constructor(timeout: number) {
    super(`Task timed out after ${timeout}ms`);
  }
}

/**
 * The timeout strategy.
 * This strategy will timeout the task after a specified duration.
 */
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

  /**
   * Execute the task with a timeout.
   *
   * If the task takes longer than the timeout, a timeout exception will be thrown.
   *
   * @template TRequest - The type of request.
   * @template TTask - The type of task.
   * @template TResult - The type of result.
   * @param {TRequest} request - The request to execute the task with.
   * @param {TTask} task - The task to execute.
   * @returns {Promise<TResult>} The result of the task.
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
