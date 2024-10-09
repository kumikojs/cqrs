import { ms } from '../../../utilities/ms/ms';
import { Strategy } from './base_strategy';
import { TimeoutException } from './exceptions/timeout_exception';

import type { TimeoutOptions } from '../../../types/core/options/resilience_options';
import type { AsyncFunction } from '../../../types/helpers';

export class TimeoutStrategy extends Strategy<TimeoutOptions> {
  static #defaultOptions: TimeoutOptions = {
    timeout: '30s',
  };

  public constructor(options?: Partial<TimeoutOptions>) {
    super({
      timeout: options?.timeout ?? TimeoutStrategy.#defaultOptions.timeout,
    });
  }

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
