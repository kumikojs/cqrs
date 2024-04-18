import { MemoryBusDriver } from '../bus/drivers/memory_bus';
import { CacheEntry } from './cache_entry/cache_entry';

import type { DurationUnit } from '../../types';
import type { Storage } from '../storage/storage';

export const CACHE_EVENT_TYPES = {
  INVALIDATED: 'invalidated',
  OPTIMISTIC_UPDATE_BEGAN: 'optimistic_update_began',
  OPTIMISTIC_UPDATE_ENDED: 'optimistic_update_ended',
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

  ttl(key: string): DurationUnit | undefined {
    const item = this.#storage.getItem(key);
    if (!item) return undefined;

    const deserialized = CacheEntry.deserialize(key, item);
    if (!deserialized) {
      return undefined;
    }

    return deserialized.ttl;
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

  optimisticUpdate<TValue>(key: string, value: TValue) {
    this.#emit('optimistic_update_began', key);

    const ttl = this.ttl(key);
    this.set(key, value, ttl);

    this.#emit('optimistic_update_ended', key);
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
