import type { UnionToIntersection } from '../../helpers';

/**
 * **OptionsContainer**
 *
 * A generic container for options that allows partial, optional, and defaulted option objects.
 * - The `options` property itself is optional.
 * - `T` can represent any shape, and all properties within `T` are optional by default.
 * - You can pass specific shapes that enforce stricter typing if needed.
 */
export type OptionsContainer<
  T extends Record<string, unknown> = Record<string, unknown>
> = {
  options?: Partial<T>;
};

type ExtractedOptions<T> = T extends {
  options?: infer O;
}
  ? O
  : never;

export type MergedPartialOptions<
  TRequest,
  KnownRequests extends Record<string, TRequest>
> = Partial<
  UnionToIntersection<ExtractedOptions<KnownRequests[keyof KnownRequests]>>
>;
