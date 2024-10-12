import type { DurationUnit } from '../helpers';

export type CacheOptions = {
  gcInterval?: DurationUnit;
  gracePeriod?: DurationUnit;
  validityPeriod?: DurationUnit;
};
