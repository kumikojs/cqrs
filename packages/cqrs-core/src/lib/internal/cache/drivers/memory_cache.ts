/* eslint-disable @typescript-eslint/no-explicit-any */

import { MemoryBusDriver } from '../../bus/drivers/memory_bus';
import { ms } from '../../ms/ms';

import type { BusDriver } from '../../bus/bus_driver';
import type { DurationUnit } from '../../ms/types';
import type { CacheDriverContract } from '../cache_driver';

interface CacheItem {
  value: any;
  expiration: number;
}

export class MemoryCacheDriver<TKey> implements CacheDriverContract<TKey> {
  #cache: Map<TKey, CacheItem> = new Map();
  #emitter: BusDriver<string> = new MemoryBusDriver({
    maxHandlersPerChannel: Infinity,
    mode: 'soft',
  });

  onInvalidate(key: TKey, handler: (key: TKey) => void) {
    this.#emitter.subscribe(`invalidate:${key}`, handler);

    return () => {
      this.#emitter.unsubscribe(`invalidate:${key}`, handler);
    };
  }

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

  set<TValue>(key: TKey, value: TValue, ttl?: DurationUnit): void {
    const expiration = ttl ? Date.now() + ms(ttl) : Infinity;

    this.#cache.set(key, { value, expiration });
  }

  delete(key: TKey): void {
    console.log('Deleting key:', key);
    this.#cache.delete(key);
    this.#emitInvalidate(key); // Emit cache invalidation event when deleting
  }

  // Method to emit cache invalidation events
  #emitInvalidate(key: TKey) {
    console.log('Emitting invalidate event for key:', key);
    this.#emitter.publish(`invalidate:${key}`, key);
  }

  #hasExpired = (item: CacheItem) => Date.now() > item.expiration;
}
