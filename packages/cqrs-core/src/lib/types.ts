/* eslint-disable @typescript-eslint/no-explicit-any */
export type Nullable<T> = T | null | undefined;
export type VoidFunction = () => void;
export type AnyFunction = (...args: any[]) => any;
export type AsyncFunction<R = any> = (...args: any[]) => Promise<R>;

/* ---------------------------------- */
/*       CombinedPartialOptions       */
/* ---------------------------------- */

/*
 * This is a type that will take a class and a method name and return the return type of that method.
 */
type ExtractedOptions<T> = T extends {
  options?: infer O;
}
  ? O
  : never;

/*
 * This is a type that will take a union of types and return the intersection of those types.
 */
type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/*
 * This is a type that will take a union of types and return the intersection of those types.
 */
export type CombinedPartialOptions<
  TRequest,
  KnownRequests extends Record<string, TRequest>
> = Partial<
  UnionToIntersection<ExtractedOptions<KnownRequests[keyof KnownRequests]>>
>;
