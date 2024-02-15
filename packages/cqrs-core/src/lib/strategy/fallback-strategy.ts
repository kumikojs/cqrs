/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AnyFunction, PromiseAnyFunction } from '../internal/types';
import { Strategy } from './internal/strategy';

export type FallbackOptions = {
  /**
   * The fallback function to be executed when the task fails.
   */
  fallback: AnyFunction;
};

export class FallbackStrategy extends Strategy<FallbackOptions> {
  public async execute<TRequest, TTask extends PromiseAnyFunction, TResponse>(
    request: TRequest,
    task: TTask
  ): Promise<TResponse> {
    try {
      return await task(request);
    } catch (error) {
      return this.options.fallback(request, error);
    }
  }
}
