import { MemoryBusDriver } from '../../bus/drivers/memory_bus';
import { ms } from '../../ms/ms';

import type { BusDriver } from '../../bus/bus_driver';
import type { DurationUnit } from '../../ms/types';
import type { CacheDriverContract } from '../cache_driver';

export class LocalStorageCacheDriver<TKey extends string>
  implements CacheDriverContract<TKey>
{
  #storage: Storage;
  #emitter: BusDriver<string> = new MemoryBusDriver({
    maxHandlersPerChannel: Infinity,
    mode: 'soft',
  });

  constructor() {
    if (!window || !window.localStorage) {
      console.error('LocalStorage is not supported in this environment.');
      this.#storage = {
        getItem: () => null,
        setItem: () => null,
        removeItem: () => null,
        clear: () => null,
        key: () => null,
        length: 0,
      };
    } else {
      this.#storage = window.localStorage;
    }
  }

  onInvalidate(key: TKey, handler: (key: TKey) => void) {
    this.#emitter.subscribe(`invalidate:${key}`, handler);

    return () => {
      this.#emitter.unsubscribe(`invalidate:${key}`, handler);
    };
  }

  get<TValue>(key: TKey): TValue | undefined {
    try {
      const item = this.#storage.getItem(key.toString());

      if (!item) {
        return undefined;
      }

      const { value, expiration } = JSON.parse(item);

      if (expiration && this.#hasExpired(expiration)) {
        this.#storage.removeItem(key.toString());
        return undefined;
      }

      return value;
    } catch (error) {
      console.error('Error while retrieving item from LocalStorage:', error);
      return undefined;
    }
  }

  set<TValue>(key: TKey, value: TValue, ttl?: DurationUnit): void {
    try {
      const expiration = ttl ? Date.now() + ms(ttl) : Infinity;

      this.#storage.setItem(
        key.toString(),
        JSON.stringify({ value, expiration })
      );
    } catch (error) {
      console.error('Error while setting item in LocalStorage:', error);
    }
  }

  delete(key: TKey): void {
    try {
      this.#storage.removeItem(key.toString());
    } catch (error) {
      console.error('Error while deleting item from LocalStorage:', error);
    } finally {
      this.#emitInvalidate(key);
    }
  }

  // Method to emit cache invalidation events
  #emitInvalidate(key: TKey) {
    console.log('Emitting invalidate event for key:', key);
    this.#emitter.publish(`invalidate:${key}`, key);
  }

  #hasExpired = (expiration: number) => Date.now() > expiration;
}
