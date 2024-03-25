/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  InterceptorContract,
  InterceptorManagerContract,
} from './contracts';
import type { Interceptor, InterceptorHandler } from './types';

export class InterceptorManager<T> implements InterceptorManagerContract<T> {
  #interceptors: InterceptorContract<any>[];

  constructor() {
    this.#interceptors = [];
  }

  use<TRequest extends T>(
    interceptor: Interceptor<TRequest> | InterceptorContract<TRequest>
  ) {
    if (typeof interceptor === 'function') {
      this.#interceptors.push({
        handle: interceptor,
      });
    } else {
      this.#interceptors.push(interceptor);
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
    handler: InterceptorHandler<TRequest>
  ): Promise<TResponse> {
    const composed = this.#interceptors.reduceRight(
      (next, interceptor) => async (ctx: TRequest) =>
        interceptor.handle(ctx, next),
      async (ctx: TRequest) => handler(ctx)
    );

    return await composed(request);
  }
}
