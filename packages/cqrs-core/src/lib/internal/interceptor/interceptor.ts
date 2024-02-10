/* eslint-disable @typescript-eslint/no-explicit-any */

export interface InterceptorContract<T> {
  handle(request: T, next?: (request: T) => Promise<T>): Promise<any>;
}

export type Interceptor<T> = (
  request: T,
  next?: (request: T) => Promise<T>
) => Promise<any>;
