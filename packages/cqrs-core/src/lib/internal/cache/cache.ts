import { DurationUnit } from '../../types';
import { MemoryBusDriver } from '../bus/drivers/memory_bus';
import { CacheEntry } from './cache_entry/cache_entry';

import type { Storage } from '../storage/storage';

export const CACHE_EVENT_TYPES = {
  INVALIDATED: 'invalidated',
  UPDATED: 'updated',
  EXPIRED: 'expired',
} as const;
export type CacheEvent =
  (typeof CACHE_EVENT_TYPES)[keyof typeof CACHE_EVENT_TYPES];

export class Cache {
  #storage: Storage;
  #emitter: MemoryBusDriver<string> = new MemoryBusDriver({
    maxHandlersPerChannel: Infinity,
    mode: 'soft',
  });

  constructor(storage: Storage) {
    this.#storage = storage;
  }

  get length() {
    return this.#storage.length;
  }

  get<TValue>(key: string): TValue | null {
    const item = this.#storage.getItem(key);
    if (!item) return null;

    const deserialized = CacheEntry.deserialize<TValue>(key, item);
    if (!deserialized) {
      return null;
    }

    console.log(
      'deserialized.isExpired()',
      deserialized.hasExpired(),
      deserialized.expiration,
      Date.now(),
      deserialized.expiration < Date.now(),
      deserialized.expiration - Date.now()
    );
    if (deserialized.hasExpired()) {
      this.#storage.removeItem(key);
      return null;
    }

    return deserialized.value ?? null;
  }

  expiration(key: string): number {
    const item = this.#storage.getItem(key);
    if (!item) return -Infinity;

    const deserialized = CacheEntry.deserialize(key, item);
    if (!deserialized) {
      return -Infinity;
    }

    return deserialized.expiration;
  }

  set<TValue>(key: string, value: TValue, ttl?: DurationUnit): void {
    const entry = new CacheEntry(key, value, ttl);
    const serialized = entry.serialize();
    if (!serialized) {
      return;
    }

    this.#storage.setItem(key, serialized);
  }

  delete(key: string): void {
    this.#storage.removeItem(key);
  }

  optimisticUpdate<TValue>(
    key: string,
    updater: (value: TValue | undefined) => TValue
  ) {
    const item = this.#storage.getItem(key);
    if (!item) {
      this.set(key, updater(undefined));
      return;
    }

    const deserialized = CacheEntry.deserialize<TValue>(key, item);
    if (!deserialized) {
      this.#storage.removeItem(key);
      return;
    }

    const value = deserialized.value;
    this.set(key, updater(value));

    this.#emit('updated', key);
  }

  clear(): void {
    this.#storage.clear();
  }

  key(index: number): string | null {
    return this.#storage.key(index);
  }

  on(eventName: CacheEvent, handler: (key: string) => void) {
    this.#emitter.subscribe(eventName, handler);

    return () => {
      this.#emitter.unsubscribe(eventName, handler);
    };
  }

  invalidate(key: string) {
    this.#emit('invalidated', key);
  }

  clearAll() {
    this.#storage.clear();
  }

  clearExpired() {
    for (let i = 0; i < this.#storage.length; i++) {
      const key = this.#storage.key(i);
      if (!key) continue;

      const item = this.#storage.getItem(key);
      if (!item) continue;

      const deserialized = CacheEntry.deserialize(key, item);
      if (!deserialized) {
        this.#storage.removeItem(key);
        continue;
      }

      if (deserialized.hasExpired()) {
        this.#storage.removeItem(key);
        this.#emit('expired', key);
      }
    }
  }

  #emit(eventName: CacheEvent, key: string) {
    this.#emitter.publish(eventName, key);
  }
}
