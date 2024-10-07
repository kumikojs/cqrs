import type { UnionToIntersection } from '../../helpers';

type GetOptions<T> = T extends {
  options: infer Options;
}
  ? Options
  : never;

export type MergedPartialOptions<
  ActionType,
  KnownActions extends Record<string, ActionType>
> = Partial<UnionToIntersection<GetOptions<KnownActions[keyof KnownActions]>>>;
