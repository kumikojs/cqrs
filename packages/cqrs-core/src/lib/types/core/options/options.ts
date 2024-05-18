import type { Optional, UnionToIntersection } from '../../helpers';

/**
 * Represents a container for options.
 */
export type OptionsContainer<T = Record<string, unknown>> = {
  options?: Optional<Record<string, unknown> & T>;
};

/**
 * Represents a type that extracts partial options if available from a given OptionsContainer.
 * @typeparam T - The type of the OptionsContainer.
 */
export type PartialOptionsIfAvailable<T extends OptionsContainer> =
  T['options'] extends infer O ? Partial<O> : never;

/**
 * Represents a type that merges partial options from multiple known requests.
 * @typeparam TRequest - The type of the OptionsContainer.
 * @typeparam KnownRequests - The type of the known requests.
 */
export type MergedPartialOptions<
  TRequest extends OptionsContainer,
  KnownRequests extends Record<string, TRequest>
> = UnionToIntersection<
  PartialOptionsIfAvailable<KnownRequests[keyof KnownRequests]>
>;
