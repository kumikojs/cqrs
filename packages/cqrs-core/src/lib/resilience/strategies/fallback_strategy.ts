/* eslint-disable @typescript-eslint/no-explicit-any */
import { Strategy } from './base_strategy';

import type { AsyncFunction } from '../../types';

export type FallbackOptions = {
  /**
   * The fallback function to be executed when the task fails.
   */
  fallback: <TRequest>(request: TRequest, error: unknown) => any;
};

export class FallbackStrategy extends Strategy<FallbackOptions> {
  public async execute<
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
