/* eslint-disable @typescript-eslint/no-explicit-any */

export type Maybe<T> = T | null | undefined;

export type VoidFunction = () => void;

export type AsyncFunction<R = any> = (...args: any[]) => Promise<R>;

export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

export type ExtractFunction<T> = T extends (...args: any[]) => any ? T : never;
