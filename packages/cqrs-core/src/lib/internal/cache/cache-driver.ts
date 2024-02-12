import type { TTL } from '../../utils/ttl';

export interface CacheDriverContract<TKey, TValue> {
  get(key: TKey): TValue | undefined;
  set(key: TKey, value: TValue, ttl?: TTL): void;
  delete(key: TKey): void;
}
