import { CacheOperation } from './cache_operation';
import { CacheStackWriter } from './cache_stack_writer';
import { CacheStackReader } from './cache_stack_reader';
import { CacheStackEmitter } from './cache_stack_emitter';
import { CacheStackCleaner } from './cache_stack_cleaner';

import type { Cache } from '../../cache/cache';
import type { DurationUnit } from '../../../utilities/ms/types';

export class CacheStackAccessor extends CacheOperation {
  readonly #dependencies: {
    writer: CacheStackWriter;
    reader: CacheStackReader;
    emitter: CacheStackEmitter;
    cleaner: CacheStackCleaner;
  };

  constructor(
    protected override layers: Map<string, Cache>,
    protected override orderedLayers: string[],
    dependencies: {
      writer: CacheStackWriter;
      reader: CacheStackReader;
      emitter: CacheStackEmitter;
      cleaner: CacheStackCleaner;
    }
  ) {
    super(layers, orderedLayers);
    this.#dependencies = dependencies;
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
    const entry = await this.#dependencies.reader.getEntry<TValue>(key);

    if (entry) {
      if (entry.shouldDelete()) {
        await this.#dependencies.cleaner.delete(key);
        const fresh = await this.#setValue(key, factory, options);
        return { data: fresh, isStale: false };
      }

      const isStale = entry.isStale();

      if (isStale && options.staleWhileRevalidate) {
        this.#setValue(key, factory, options)
          .then(() => this.#dependencies.emitter.emit('cache:revalidated', key))
          .catch(() => {
            this.#dependencies.emitter.emit('cache:revalidation:failed', key);
          });

        return { data: entry.value, isStale: true };
      }

      if (isStale) {
        const fresh = await this.#setValue(key, factory, options);
        return { data: fresh, isStale: false };
      }

      return { data: entry.value, isStale: false };
    }

    const fresh = await this.#setValue(key, factory, options);
    return { data: fresh, isStale: false };
  }

  async #setValue<TValue>(
    key: string,
    factory: () => Promise<TValue>,
    options: {
      validityPeriod?: DurationUnit;
      cacheTime?: DurationUnit;
    }
  ): Promise<TValue> {
    const value = await factory();
    await this.#dependencies.writer.set(key, value, options);
    return value;
  }
}
