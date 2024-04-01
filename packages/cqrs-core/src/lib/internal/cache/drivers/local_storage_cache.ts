import { MemoryBusDriver } from '../../bus/drivers/memory_bus';
import { ms } from '../../ms/ms';

import type { DurationUnit, VoidFunction } from '../../../types';
import type { BusDriver } from '../../bus/bus_driver';
import type { CacheDriver } from '../cache_driver';

/**
 * The LocalStorageCacheDriver is a simple cache driver that uses the LocalStorage API
 * to store and retrieve values.
 * It also emits cache invalidation events when a key is invalidated.
 *
 * @template TKey - The type of key to use.
 * @implements CacheDriver<TKey> - The cache driver contract.
 */

interface CacheItem {
  value: unknown;
  expiration: number;
}

export class LocalStorageCacheDriver<TKey extends string>
  implements CacheDriver<TKey>
{
  /**
   * The LocalStorage API.
   *
   * @type {Storage}
   */
  #storage: Storage;

  /**
   * The event emitter.
   *
   * @type {BusDriver<string>}
   */
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

  get<TValue>(ns: string, key: TKey): TValue | undefined {
    const item = this.#storage.getItem(`${ns}:${key}`);
    if (!item) return undefined;

    try {
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

  set<TValue>(ns: string, key: TKey, value: TValue, ttl?: DurationUnit): void {
    const expiration = ttl ? Date.now() + ms(ttl) : Infinity;
    this.#storage.setItem(
      `${ns}:${key}`,
      JSON.stringify({ value, expiration })
    );
  }

  delete(ns: string, key?: TKey): void {
    if (key) {
      this.#storage.removeItem(`${ns}:${key}`);
    } else {
      for (let i = 0; i < this.#storage.length; i++) {
        const key = this.#storage.key(i);
        if (key?.startsWith(`${ns}:`)) {
          this.#storage.removeItem(key);
        }
      }
    }
  }

  #hasNamespace(ns: string): boolean {
    for (let i = 0; i < this.#storage.length; i++) {
      const key = this.#storage.key(i);
      if (key?.startsWith(`${ns}:`)) {
        return true;
      }
    }

    return false;
  }

  invalidate(ns: string, key?: TKey): void {
    if (this.#hasNamespace(ns)) {
      this.delete(ns, key);
      this.#emitInvalidate(ns, key);
    }
  }

  onInvalidate(ns: string, handler: (key: TKey) => void): VoidFunction {
    this.#emitter.subscribe(`invalidate:${ns}`, handler);

    return () => {
      this.#emitter.unsubscribe(`invalidate:${ns}`, handler);
    };
  }

  #emitInvalidate(ns: string, key?: TKey): void {
    this.#emitter.publish(`invalidate:${ns}`, key);
  }

  #hasExpired = (item: CacheItem) => Date.now() > item.expiration;
}
