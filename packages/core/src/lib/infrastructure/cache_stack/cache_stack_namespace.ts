import { CacheEntry } from '../cache/cache_entry/cache_entry';
import { CacheStack } from './cache_stack';

import type { DurationUnit } from '../../utilities/ms/types';
import type { CacheEvent } from '../cache/cache';

export class CacheStackNamespace {
  #namespace: string;
  #stack: CacheStack;

  constructor(namespace: string, stack: CacheStack) {
    if (!namespace) {
      throw new Error('Namespace cannot be empty');
    }
    this.#namespace = namespace;
    this.#stack = stack;
  }

  async get<TValue>(
    key: string
  ): Promise<{ data: TValue | undefined; isStale: boolean }> {
    return this.#stack.reader.get<TValue>(this.#getNamespacedKey(key));
  }

  async getEntry<TValue>(key: string): Promise<CacheEntry<TValue> | undefined> {
    return this.#stack.reader.getEntry<TValue>(this.#getNamespacedKey(key));
  }

  async set<TValue>(
    key: string,
    value: TValue,
    options: {
      validityPeriod?: DurationUnit;
      cacheTime?: DurationUnit;
    } = {}
  ): Promise<void> {
    await this.#stack.writer.set(this.#getNamespacedKey(key), value, options);
  }

  async getOrSet<TValue>(
    key: string,
    factory: () => Promise<TValue>,
    options: {
      validityPeriod?: DurationUnit;
      cacheTime?: DurationUnit;
      staleWhileRevalidate?: boolean;
    } = {}
  ): Promise<{ data: TValue | undefined; isStale: boolean }> {
    return this.#stack.accessor.getOrSet(
      this.#getNamespacedKey(key),
      factory,
      options
    );
  }

  async invalidate(key: string): Promise<void> {
    await this.#stack.invalidator.invalidate(this.#getNamespacedKey(key));
  }

  async invalidateAll(): Promise<void> {
    const keys = await this.#getAllKeys();

    this.#stack.invalidator.invalidateMany(keys);
  }

  async invalidatePattern(pattern: RegExp): Promise<void> {
    const namespacedPattern = new RegExp(
      `${this.#namespace}:${pattern.source}`
    );
    await this.#stack.invalidator.invalidatePattern(namespacedPattern);
  }

  async delete(key: string): Promise<void> {
    await this.#stack.cleaner.delete(this.#getNamespacedKey(key));
  }

  emit(event: CacheEvent, key: string): void {
    this.#stack.emitter.emit(event, this.#getNamespacedKey(key));
  }

  on(event: CacheEvent, handler: (key: string) => void): () => void {
    return this.#stack.emitter.on(event, (namespacedKey: string) => {
      if (namespacedKey.startsWith(`${this.#namespace}:`)) {
        handler(this.#removeNamespacePrefix(namespacedKey));
      }
    });
  }

  async clear(): Promise<void> {
    const keys = await this.#getAllKeys();
    await Promise.allSettled(
      keys.map((key) => this.#stack.invalidator.invalidate(key))
    );
  }

  async #getAllKeys(): Promise<string[]> {
    const allKeys = new Set<string>();
    const prefix = `${this.#namespace}:`;

    for (const layerName of this.#stack.getLayerNames()) {
      const cache = this.#stack.getLayer(layerName);
      if (!cache) continue;

      try {
        const length = await cache.length();
        for (let i = 0; i < length; i++) {
          try {
            const key = await cache.key(i);
            if (key?.startsWith(prefix)) {
              allKeys.add(key);
            }
          } catch (error) {
            console.error(
              `Failed to get key at index ${i} from layer ${layerName}:`,
              error
            );
            continue;
          }
        }
      } catch (error) {
        console.error(`Failed to get length from layer ${layerName}:`, error);
        continue;
      }
    }

    return Array.from(allKeys);
  }

  #getNamespacedKey(key: string): string {
    return `${this.#namespace}:${key}`;
  }

  #removeNamespacePrefix(namespacedKey: string): string {
    const prefix = `${this.#namespace}:`;
    return namespacedKey.startsWith(prefix)
      ? namespacedKey.slice(prefix.length)
      : namespacedKey;
  }
}
