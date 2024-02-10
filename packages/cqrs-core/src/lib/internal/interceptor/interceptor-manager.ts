/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Interceptor, InterceptorContract } from './interceptor';

type Handler<T> = (request: T) => Promise<any>;

export interface InterceptorManagerContract<T> {
  use<TRequest extends T>(
    interceptor: Interceptor<TRequest> | InterceptorContract<TRequest>
  ): void;

  execute<TRequest extends T>(
    request: TRequest,
    handler: Handler<TRequest>
  ): Promise<any>;
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
  }

  async execute<TRequest extends T>(
    request: TRequest,
    handler: Handler<TRequest>
  ) {
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
