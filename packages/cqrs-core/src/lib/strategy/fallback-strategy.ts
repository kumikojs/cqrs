import type { AnyFunction, PromiseAnyFunction } from '../internal/types';
import { Strategy } from './internal/strategy';

type FallbackOptions = {
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
