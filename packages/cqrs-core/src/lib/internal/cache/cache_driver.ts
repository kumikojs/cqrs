import type { DurationUnit } from '../ms/types';

export interface CacheDriverContract<TKey> {
  get<TValue>(key: TKey): TValue | undefined;
  set<TValue>(key: TKey, value: TValue, ttl?: DurationUnit | number): void;
  delete(key: TKey): void;
}
