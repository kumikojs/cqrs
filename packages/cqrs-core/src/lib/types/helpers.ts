/* eslint-disable @typescript-eslint/no-explicit-any */

export type Maybe<T> = T | null | undefined;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type MaybePromise<T> = Promise<Maybe<T>>;

export type NullablePromise<T> = Promise<Nullable<T>>;

export type OptionalPromise<T> = Promise<Optional<T>>;

export type VoidFunction = () => void;

export type AsyncFunction<R = any> = (...args: any[]) => Promise<R>;

export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;
