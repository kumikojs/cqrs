/* eslint-disable @typescript-eslint/no-explicit-any */

export interface InterceptorContract<T> {
  handle(context: T, next?: (context: T) => Promise<T>): Promise<any>;
}

export type Interceptor<T> = (
  context: T,
  next?: (context: T) => Promise<T>
) => Promise<any>;
