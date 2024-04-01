/* eslint-disable @typescript-eslint/no-explicit-any */

import type {
  InterceptorContract,
  InterceptorManagerContract,
} from './interceptor_contracts';
import type { Interceptor, InterceptorHandler } from './interceptor_types';

/**
 * The InterceptorManager is a simple class that allows you to register
 * and execute interceptors.
 *
 * @template T - The type of the query to intercept.
 */
export class InterceptorManager<T> implements InterceptorManagerContract<T> {
  /**
   * The list of interceptors.
   *
   * @type {InterceptorContract<any>[]}
   */
  #interceptors: InterceptorContract<any>[];

  constructor() {
    this.#interceptors = [];
  }

  /**
   * Register an interceptor.
   *
   * @template TRequest - The type of request to intercept.
   * @param {Interceptor<TRequest> | InterceptorContract<TRequest>} interceptor - The interceptor to register.
   * @returns {this} The current instance of the interceptor manager.
   */
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

  /**
   * Tap into the interceptor chain.
   *
   * @template TRequest - The type of request to intercept.
   * @param {function(query: TRequest): boolean} selector - The selector to determine if the interceptor should be executed.
   * @param {Interceptor<TRequest>} interceptor - The interceptor to execute.
   * @returns {this} The current instance of the interceptor manager.
   */
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

  /**
   * Execute the interceptors pipeline.
   *
   * @template TRequest - The type of request to intercept.
   * @template TResponse - The type of response from the handler.
   * @param {TRequest} request - The request to intercept.
   * @param {InterceptorHandler<TRequest>} handler - The handler to execute.
   * @returns {Promise<TResponse>} The response from the handler.
   */
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
