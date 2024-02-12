/* eslint-disable @typescript-eslint/no-explicit-any */
import { ttlToMilliseconds, type TTL } from '../../../utils/ttl';
import type { CacheDriverContract } from '../cache-driver';

interface CacheItem<TValue> {
  value: TValue;
  expiration: number;
}

export class InMemoryCacheDriver<TKey, TValue>
  implements CacheDriverContract<TKey, TValue>
{
  static #instance: InMemoryCacheDriver<any, any>;
  #cache: Map<TKey, CacheItem<TValue>> = new Map();

  private constructor() {
    // Singleton
  }

  static getInstance() {
    if (!InMemoryCacheDriver.#instance) {
      InMemoryCacheDriver.#instance = new InMemoryCacheDriver();
    }

    return InMemoryCacheDriver.#instance;
  }

  get(key: TKey): TValue | undefined {
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

  set(key: TKey, value: TValue, ttl?: TTL): void {
    const expiration = ttl ? Date.now() + ttlToMilliseconds(ttl) : Infinity;

    this.#cache.set(key, { value, expiration });
  }

  delete(key: TKey): void {
    this.#cache.delete(key);
  }

  #hasExpired = (item: CacheItem<TValue>) => Date.now() > item.expiration;
}
