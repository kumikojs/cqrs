import type { TTL } from '../../utils/ttl';

export interface CacheDriverContract<TKey> {
  get<TValue>(key: TKey): TValue | undefined;
  set<TValue>(key: TKey, value: TValue, ttl?: TTL): void;
  delete(key: TKey): void;
}
