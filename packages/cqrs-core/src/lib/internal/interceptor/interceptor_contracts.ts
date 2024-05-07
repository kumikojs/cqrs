/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InterceptorHandler } from './interceptor_types';

/**
 * Contract for the Interceptor.
 *
 * The Interceptor is responsible for intercepting the request and modifying it before it's sent to the handler.
 *
 * @template T - The type of request to intercept.
 */
export interface InterceptorContract<T> {
  /**
   * Handle the request.
   *
   * @param request - The request to handle.
   * @param next - The next interceptor in the chain.
   * @returns The response from the handler.
   */
  handle(request: T, next?: (request: T) => Promise<any>): Promise<any>;
}

/**
 * Contract for the Interceptor Manager.
 *
 * The Interceptor Manager is responsible for managing the interceptors and executing them in the correct order.
 * It's the central place for managing cross-cutting concerns.
 */
export interface InterceptorManagerContract<T> {
  /**
   * Add an interceptor to the manager.
   *
   * @template TRequest - The type of request to intercept.
   * @param name - The name of the interceptor.
   * @param interceptor - The interceptor to add.
   * @returns The interceptor manager.
   */
  use<TRequest extends T>(
    name: string,
    interceptor:
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle']
  ): this;
  use<TRequest extends T>(
    interceptor:
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle']
  ): this;
  use<TRequest extends T>(
    nameOrInterceptor:
      | string
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle'],
    interceptor?:
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle']
  ): this;

  /**
   * Tap into the interceptor chain.
   *
   * @template TRequest - The type of request to intercept.
   * @param name - The name of the interceptor.
   * @param selector - The selector function to determine if the interceptor should be applied.
   * @param interceptor - The interceptor to apply.
   * @returns The interceptor manager.
   */
  tap<TRequest extends T>(
    selector: (request: TRequest) => boolean,
    interceptor:
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle']
  ): this;
  tap<TRequest extends T>(
    name: string,
    selector: (request: TRequest) => boolean,
    interceptor:
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle']
  ): this;
  tap<TRequest extends T>(
    nameOrSelector: string | ((request: TRequest) => boolean),
    interceptorOrSelector:
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle']
      | ((request: TRequest) => boolean),
    interceptor?:
      | InterceptorContract<TRequest>
      | InterceptorContract<TRequest>['handle']
  ): this;

  /**
   * Execute the interceptors.
   *
   * @template TRequest - The type of request to intercept.
   * @template TResponse - The type of response from the handler.
   * @param request - The request to handle.
   * @param handler - The handler to execute.
   * @returns The response from the handler.
   */
  execute<TRequest, TResponse>(
    request: TRequest,
    handler: InterceptorHandler<TRequest>
  ): Promise<TResponse>;

  /**
   * Clear all interceptors.
   */
  disconnect(): void;
}
