import { NoHandlerFoundException } from '../../../infrastructure/bus/bus_exception';
import { Strategy } from './base_strategy';

import type { DefaultHandlerOptions } from '../../../types/core/options/resilience_options';
import type { AsyncFunction } from '../../../types/helpers';

export class DefaultHandlerStrategy extends Strategy<DefaultHandlerOptions> {
  constructor(options: DefaultHandlerOptions) {
    super(options);
  }

  async execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    try {
      return await task(request);
    } catch (error) {
      if (
        error instanceof NoHandlerFoundException &&
        this.options.defaultHandler
      ) {
        return await this.options.defaultHandler<TRequest, TResult>(request);
      }

      throw error;
    }
  }
}
