/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The interceptor handler function type.
 *
 * @template T - The type of request to handle.
 */
export type InterceptorHandler<T> = (request: T) => Promise<any>;
