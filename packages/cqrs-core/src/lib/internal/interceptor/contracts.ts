/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Interceptor, InterceptorHandler } from './types';

export interface InterceptorContract<T> {
  handle(request: T, next?: (request: T) => Promise<any>): Promise<any>;
}

export interface InterceptorManagerContract<T> {
  use<TRequest extends T>(
    interceptor: Interceptor<TRequest> | InterceptorContract<TRequest>
  ): this;

  tap<TRequest extends T>(
    selector: (request: TRequest) => boolean,
    interceptor: Interceptor<TRequest>
  ): this;

  execute<TRequest, TResponse>(
    request: TRequest,
    handler: InterceptorHandler<TRequest>
  ): Promise<TResponse>;
}
