import type { DurationUnit } from '../../utilities/ms/types';

export type CacheOptions = {
  gcInterval?: DurationUnit;
  gracePeriod?: DurationUnit;
  validityPeriod?: DurationUnit;
};
