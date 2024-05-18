/* eslint-disable @typescript-eslint/no-explicit-any */
import { StoikLogger } from '../../utilities/logger/stoik_logger';

import type {
  InterceptorContract,
  InterceptorHandler,
  InterceptorManagerContract,
} from '../../types/infrastructure/interceptor';

export class InterceptorManager<T> implements InterceptorManagerContract<T> {
  #interceptors: InterceptorContract<any>[] = [];
  #logger: StoikLogger;

  constructor(logger: StoikLogger) {
    this.#logger = logger.child({ topics: ['interceptors'] });
  }

  disconnect(): void {
    this.#interceptors = [];
  }

  use<TRequest extends T>(
    nameOrInterceptor:
      | string
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle'],
    interceptor?:
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle']
  ): this {
    const name =
      typeof nameOrInterceptor === 'string'
        ? nameOrInterceptor
        : 'stoik.interceptors.anonymous';
    const effectiveInterceptor = interceptor ?? nameOrInterceptor;
    this.#registerInterceptor(
      name,
      effectiveInterceptor as
        | InterceptorContract<TRequest>
        | InterceptorContract<TRequest>['handle']
    );
    return this;
  }

  tap<TRequest extends T>(
    nameOrSelector: string | ((query: TRequest) => boolean),
    selectorOrInterceptor:
      | ((query: TRequest) => boolean)
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle'],
    interceptor?:
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle']
  ): this {
    const name =
      typeof nameOrSelector === 'string'
        ? nameOrSelector
        : 'stoik.interceptors.tap-anonymous';
    const selector =
      typeof nameOrSelector === 'function'
        ? nameOrSelector
        : (selectorOrInterceptor as (query: TRequest) => boolean);
    const effectiveInterceptor =
      typeof nameOrSelector === 'function'
        ? (selectorOrInterceptor as
            | InterceptorContract<TRequest>
            | InterceptorContract<TRequest>['handle'])
        : interceptor;

    this.use(
      name,
      async (query: TRequest, next: InterceptorHandler<TRequest>) => {
        if (selector(query)) {
          if (typeof effectiveInterceptor === 'function') {
            return effectiveInterceptor(query, next);
          }
          return effectiveInterceptor?.handle(query, next);
        }
        return next(query);
      }
    );
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

  #registerInterceptor<TRequest extends T>(
    name: string,
    interceptor:
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle']
  ): void {
    const wrappedInterceptor = this.#wrapInterceptor(name, interceptor);
    this.#interceptors.push(wrappedInterceptor);
    this.#logger.info(`Interceptor added: ${name}`);
  }

  #wrapInterceptor<TRequest extends T>(
    name: string,
    interceptor:
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle']
  ): InterceptorContract<TRequest> {
    if (typeof interceptor === 'function') {
      return {
        handle: async (request, next) => {
          this.#logger.debug(`Executing interceptor '${name}'`, { request });

          return interceptor(request, next);
        },
      };
    }
    return interceptor;
  }
}
