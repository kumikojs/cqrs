import type { EventContract } from '../../event/event';

export type InvalidatedQueries = EventContract<
  'invalidated-queries',
  { queries: string[] }
>;
