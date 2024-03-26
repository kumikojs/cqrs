/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The interceptor function type.
 *
 * @template T - The type of request to intercept.
 */
export type Interceptor<T> = (
  request: T,
  next?: (request: T) => Promise<T>
) => Promise<any>;

/**
 * The interceptor handler function type.
 *
 * @template T - The type of request to handle.
 */
export type InterceptorHandler<T> = (request: T) => Promise<any>;
