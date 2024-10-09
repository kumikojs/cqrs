/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from './base_strategy';

import type { AsyncFunction } from '../../../types/helpers';
import type { FallbackOptions } from '../../../types/core/options/resilience_options';

export class FallbackStrategy extends Strategy<FallbackOptions> {
  async execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    try {
      return await task(request);
    } catch (error) {
      return this.options.fallback(request, error);
    }
  }
}
