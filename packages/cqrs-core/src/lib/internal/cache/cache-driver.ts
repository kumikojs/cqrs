import type { TTL } from '../../utils/ttl';

export interface CacheDriverContract<TKey> {
  get<TValue>(key: TKey): Promise<TValue | undefined>;
  set<TValue>(key: TKey, value: TValue, ttl?: TTL | number): Promise<void>;
  delete(key: TKey): void;
}
