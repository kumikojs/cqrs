/* eslint-disable @typescript-eslint/no-explicit-any */

export type Interceptor<T> = (
  request: T,
  next?: (request: T) => Promise<T>
) => Promise<any>;

export type InterceptorHandler<T> = (request: T) => Promise<any>;
