/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PromiseAnyFunction } from '../internal/types';

import { Strategy } from './internal/strategy';

export type FallbackOptions = {
  /**
   * The fallback function to be executed when the task fails.
   */
  fallback: <TRequest>(request: TRequest, error: unknown) => any;
};

export class FallbackStrategy extends Strategy<FallbackOptions> {
  public async execute<
    TRequest,
    TTask extends PromiseAnyFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    try {
      return await task(request);
    } catch (error) {
      return this.options.fallback(request, error);
    }
  }
}
