/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Interceptor, InterceptorContract } from './interceptor';

type Handler<T> = (request: T) => Promise<any>;

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
    handler: Handler<TRequest>
  ): Promise<TResponse>;
}

export class InterceptorManager<T> implements InterceptorManagerContract<T> {
  #interceptors: InterceptorContract<any>[];

  constructor() {
    this.#interceptors = [];
  }

  use<TRequest extends T>(
    interceptor: Interceptor<TRequest> | InterceptorContract<TRequest>
  ) {
    if (this.#isInterceptorContract(interceptor)) {
      this.#interceptors.push(interceptor);
    } else {
      this.#interceptors.push({
        handle: interceptor,
      });
    }

    return this;
  }

  tap<TRequest extends T>(
    selector: (query: TRequest) => boolean,
    interceptor: Interceptor<TRequest>
  ): this {
    this.use<TRequest>(async (query, next) => {
      if (selector(query)) {
        return interceptor(query, next);
      }

      return next?.(query);
    });

    return this;
  }

  async execute<TRequest, TResponse>(
    request: TRequest,
    handler: Handler<TRequest>
  ): Promise<TResponse> {
    const composed = this.#interceptors.reduceRight(
      (next, interceptor) => async (ctx: TRequest) =>
        interceptor.handle(ctx, next),
      async (ctx: TRequest) => handler(ctx)
    );

    return await composed(request);
  }

  #isInterceptorContract<TRequest extends T>(
    interceptor: Interceptor<TRequest> | InterceptorContract<TRequest>
  ): interceptor is InterceptorContract<TRequest> {
    return 'handle' in interceptor;
  }
}
