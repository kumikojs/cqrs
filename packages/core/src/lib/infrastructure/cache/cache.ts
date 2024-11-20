import { MemoryBusDriver } from '../bus/drivers/memory_bus';
import { LockManager } from '../lock/lock_manager';
import { CacheEntry } from './cache_entry/cache_entry';
import { CacheScheduler } from './cache_scheduler';
import { AsyncCache } from './facades/async_cache';
import { SyncCache } from './facades/sync_cache';

import type {
  AsyncStorageDriver,
  SyncStorageDriver,
} from '../../types/infrastructure/storage';
import type { DurationUnit } from '../../utilities/ms/types';

export type CacheOptions = {
  validityPeriod?: DurationUnit;
  cacheTime?: DurationUnit;
};

export type CacheConfig = {
  name: string;
  storage: SyncStorageDriver | AsyncStorageDriver;
  validityPeriod?: DurationUnit;
  cacheTime?: DurationUnit;
  gcInterval?: DurationUnit;
};

/**
 * Defines the event types for the cache.
 */
export const CACHE_EVENT_TYPES = {
  EXPIRED: 'cache:expired',
  INVALIDATED: 'cache:invalidated',
  REVALIDATED: 'cache:revalidated',
  REVALIDATION_FAILED: 'cache:revalidation:failed',
  REMOVED: 'cache:removed',
  CLEARED: 'cache:cleared',
  CLEARED_EXPIRED: 'cache:cleared:expired',
  OPTIMISTIC_UPDATE: 'cache:optimistic:update',
  OPTIMISTIC_ROLLBACK: 'cache:optimistic:rollback',
  OPTIMISTIC_DELETE: 'cache:optimistic:delete',
  STALE_UPDATED: 'cache:stale:updated',
} as const;

/**
 * Represents a cache event.
 */
export type CacheEvent =
  (typeof CACHE_EVENT_TYPES)[keyof typeof CACHE_EVENT_TYPES];

export class Cache {
  #name: string;
  #cache: SyncCache | AsyncCache;
  #validityPeriod: DurationUnit;
  #cacheTime: DurationUnit;
  #emitter: MemoryBusDriver<string>;
  #scheduler: CacheScheduler;
  #lockManager: LockManager;

  constructor({
    name,
    storage,
    validityPeriod = CacheEntry.DEFAULT_VALIDITY_PERIOD,
    cacheTime = CacheEntry.DEFAULT_CACHE_TIME,
    gcInterval = '1m',
  }: CacheConfig) {
    this.#name = name;
    this.#cache =
      'getAllKeys' in storage
        ? new AsyncCache(storage)
        : new SyncCache(storage);

    this.#validityPeriod = validityPeriod;
    this.#cacheTime = cacheTime;
    this.#emitter = new MemoryBusDriver({
      maxHandlersPerChannel: Infinity,
      mode: 'soft',
    });
    this.#lockManager = new LockManager();

    // Schedule garbage collection
    this.#scheduler = new CacheScheduler(gcInterval)
      .schedule(async () => {
        await this.#deleteExpired();
      })
      .connect();

    this.#deleteExpired();
  }

  get name(): string {
    return this.#name;
  }

  async get<TValue>(
    key: string
  ): Promise<{ data: TValue | undefined; isStale: boolean }> {
    await this.#lockManager.lock(key);

    try {
      const entry = await this.#getEntry<TValue>(key);

      if (!entry) {
        return { data: undefined, isStale: false };
      }

      if (entry.shouldDelete()) {
        await this.#delete(key);

        return { data: undefined, isStale: false };
      }

      return {
        data: entry.value,
        isStale: entry.isStale(),
      };
    } finally {
      this.#lockManager.unlock(key);
    }
  }

  async getEntry<TValue>(key: string): Promise<CacheEntry<TValue> | undefined> {
    await this.#lockManager.lock(key);

    try {
      const entry = await this.#getEntry<TValue>(key);

      if (!entry) return undefined;

      if (entry.shouldDelete()) {
        await this.#delete(key);
        return undefined;
      }

      return entry;
    } finally {
      this.#lockManager.unlock(key);
    }
  }

  async set<TValue>(
    key: string,
    value: TValue,
    options: CacheOptions = {
      validityPeriod: this.#validityPeriod,
      cacheTime: this.#cacheTime,
    }
  ): Promise<void> {
    await this.#lockManager.lock(key);

    try {
      const entry = new CacheEntry({
        key,
        value,
        validityPeriod: options.validityPeriod,
        cacheTime: options.cacheTime,
      });

      await this.#setEntry(key, entry);
    } finally {
      this.#lockManager.unlock(key);
    }
  }

  async setEntry<TValue>(
    key: string,
    entry: CacheEntry<TValue>
  ): Promise<void> {
    await this.#lockManager.lock(key);

    try {
      await this.#setEntry(key, entry);
    } finally {
      this.#lockManager.unlock(key);
    }
  }

  async delete(key: string): Promise<void> {
    await this.#lockManager.lock(key);
    try {
      await this.#delete(key);
    } finally {
      this.#lockManager.unlock(key);
    }
  }

  async clear(): Promise<void> {
    await this.#cache.clear();
    this.emit(CACHE_EVENT_TYPES.CLEARED, '');
  }

  async *keys(): AsyncGenerator<string> {
    for (let i = 0; i < (await this.#length()); i++) {
      const key = await this.#cache.key(i);
      if (key) yield key;
    }
  }

  on(event: CacheEvent, handler: (key: string) => void): () => void {
    this.#emitter.subscribe(event, handler);
    return () => {
      this.#emitter.unsubscribe(event, handler);
    };
  }

  emit(event: CacheEvent, key: string): void {
    this.#emitter.publish(event, key);
  }

  disconnect(): void {
    this.#cache.disconnect();
    this.#emitter.disconnect();
    this.#scheduler.disconnect();
  }

  async invalidate(key: string): Promise<void> {
    await this.#lockManager.lock(key);

    try {
      const entry = await this.#getEntry(key);
      if (entry) {
        await this.#cache.removeItem(key);
        this.emit(CACHE_EVENT_TYPES.INVALIDATED, key);
      }
    } finally {
      this.#lockManager.unlock(key);
    }
  }

  async invalidateMany(keys: string[]): Promise<void> {
    await Promise.allSettled(keys.map((key) => this.invalidate(key)));
  }

  async #getEntry<TValue>(
    key: string
  ): Promise<CacheEntry<TValue> | undefined> {
    const item = await this.#cache.getItem(key);
    if (!item) return undefined;

    return CacheEntry.deserialize<TValue>(key, item);
  }

  async #setEntry<TValue>(
    key: string,
    entry: CacheEntry<TValue>
  ): Promise<void> {
    const serialized = entry.serialize();
    if (!serialized) return;

    await this.#cache.setItem(key, serialized);
  }

  async #delete(key: string): Promise<void> {
    await this.#cache.removeItem(key);
    this.emit(CACHE_EVENT_TYPES.REMOVED, key);
  }

  async #deleteExpired(): Promise<void> {
    const keys = this.keys();
    for await (const key of keys) {
      const entry = await this.#getEntry(key);
      if (!entry) continue;

      if (entry.shouldDelete()) {
        await this.#delete(key);
      }
    }

    this.emit(CACHE_EVENT_TYPES.CLEARED_EXPIRED, '');
  }

  async #length() {
    if (typeof this.#cache.length === 'function') {
      return await this.#cache.length();
    }

    return this.#cache.length;
  }
}
