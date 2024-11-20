import { Cache } from '../cache/cache';
import { CacheStackNamespace } from './cache_stack_namespace';
import { CacheStackAccessor } from './operations/cache_stack_accessor';
import { CacheStackCleaner } from './operations/cache_stack_cleaner';
import { CacheStackEmitter } from './operations/cache_stack_emitter';
import { CacheStackInvalidator } from './operations/cache_stack_invalidator';
import { CacheStackOptimistic } from './operations/cache_stack_optimistic';
import { CacheStackReader } from './operations/cache_stack_reader';
import { CacheStackWriter } from './operations/cache_stack_writer';

import type {
  AsyncStorageDriver,
  SyncStorageDriver,
} from '../../types/infrastructure/storage';
import type { CacheOptions } from '../cache/cache';
import { DurationUnit } from '../../utilities/ms/types';

export type CacheLayerConfig = {
  name: string;
  storage: SyncStorageDriver | AsyncStorageDriver;
  options?: Partial<CacheOptions>;
};

export type CacheStackOptions = {
  layers: CacheLayerConfig[];
  defaultOptions?: {
    validityPeriod?: DurationUnit;
    cacheTime?: DurationUnit;
    gcInterval?: DurationUnit;
  };
};

export class CacheStack {
  #layers: Map<string, Cache> = new Map();
  readonly #orderedLayers: string[] = [];

  readonly reader: CacheStackReader;
  readonly writer: CacheStackWriter;
  readonly invalidator: CacheStackInvalidator;
  readonly cleaner: CacheStackCleaner;
  readonly emitter: CacheStackEmitter;
  readonly optimistic: CacheStackOptimistic;
  readonly accessor: CacheStackAccessor;

  constructor({ layers, defaultOptions = {} }: CacheStackOptions) {
    for (const { name, storage, options } of layers) {
      const cache = new Cache({
        name,
        storage,
        ...defaultOptions,
        ...options,
      });

      this.#layers.set(name, cache);
      this.#orderedLayers.push(name);
    }

    this.writer = new CacheStackWriter(this.#layers, this.#orderedLayers);
    this.reader = new CacheStackReader(this.#layers, this.#orderedLayers);
    this.emitter = new CacheStackEmitter(this.#layers, this.#orderedLayers);
    this.invalidator = new CacheStackInvalidator(
      this.#layers,
      this.#orderedLayers
    );
    this.cleaner = new CacheStackCleaner(this.#layers, this.#orderedLayers);
    this.optimistic = new CacheStackOptimistic(
      this.#layers,
      this.#orderedLayers,
      {
        emitter: this.emitter,
        invalidator: this.invalidator,
        reader: this.reader,
        writer: this.writer,
      }
    );
    this.accessor = new CacheStackAccessor(this.#layers, this.#orderedLayers, {
      cleaner: this.cleaner,
      emitter: this.emitter,
      reader: this.reader,
      writer: this.writer,
    });
  }

  getLayer(name: string): Cache | undefined {
    return this.#layers.get(name);
  }

  getLayerNames(): readonly string[] {
    return this.#orderedLayers;
  }

  disconnect(): void {
    this.emitter.disconnect();
  }

  namespace(name: string): CacheStackNamespace {
    return new CacheStackNamespace(name, this);
  }
}
