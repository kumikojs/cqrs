/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Interceptor, InterceptorContract } from './interceptor';

type Handler<T> = (context: T) => Promise<any>;

export interface InterceptorManagerContract<T> {
  use<TContext extends T>(
    interceptor: Interceptor<TContext> | InterceptorContract<TContext>
  ): void;

  execute<TContext extends T>(
    context: TContext,
    handler: Handler<TContext>
  ): Promise<any>;
}

export class InterceptorManager<T> implements InterceptorManagerContract<T> {
  #interceptors: InterceptorContract<any>[];

  constructor() {
    this.#interceptors = [];
  }

  use<TContext extends T>(
    interceptor: Interceptor<TContext> | InterceptorContract<TContext>
  ) {
    if (this.#isInterceptorContract(interceptor)) {
      this.#interceptors.push(interceptor);
    } else {
      this.#interceptors.push({
        handle: interceptor,
      });
    }
  }

  async execute<TContext extends T>(
    context: TContext,
    handler: Handler<TContext>
  ) {
    const composed = this.#interceptors.reduceRight(
      (next, interceptor) => async (ctx: TContext) =>
        interceptor.handle(ctx, next),
      async (ctx: TContext) => handler(ctx)
    );

    return await composed(context);
  }

  #isInterceptorContract<TContext extends T>(
    interceptor: Interceptor<TContext> | InterceptorContract<TContext>
  ): interceptor is InterceptorContract<TContext> {
    return 'handle' in interceptor;
  }
}
