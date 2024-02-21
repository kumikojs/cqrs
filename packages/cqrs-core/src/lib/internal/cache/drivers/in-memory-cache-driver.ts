/* eslint-disable @typescript-eslint/no-explicit-any */
import { ttlToMilliseconds, type TTL } from '../../../utils/ttl';
import type { CacheDriverContract } from '../cache-driver';

interface CacheItem {
  value: any;
  expiration: number;
}

export class InMemoryCacheDriver<TKey> implements CacheDriverContract<TKey> {
  #cache: Map<TKey, CacheItem> = new Map();

  get<TValue>(key: TKey): TValue | undefined {
    const item = this.#cache.get(key);

    if (!item) {
      return undefined;
    }

    if (this.#hasExpired(item)) {
      this.#cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  set<TValue>(key: TKey, value: TValue, ttl?: TTL): void {
    const expiration = ttl ? Date.now() + ttlToMilliseconds(ttl) : Infinity;

    this.#cache.set(key, { value, expiration });
  }

  delete(key: TKey): void {
    this.#cache.delete(key);
  }

  #hasExpired = (item: CacheItem) => Date.now() > item.expiration;
}