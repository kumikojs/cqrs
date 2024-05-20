import type { Optional, UnionToIntersection } from '../../helpers';

/**
 * Represents a container for options.
 */
export type OptionsContainer<T = Record<string, unknown>> = {
  options?: Optional<Record<string, unknown> & T>;
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
