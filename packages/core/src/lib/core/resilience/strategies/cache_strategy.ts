import { JsonSerializer } from '../../../utilities/serializer/json_serializer';
import { QueryCache } from '../../query/query_cache';
import { Strategy } from './base_strategy';

import type { ResilienceCacheOptions } from '../../../types/core/options/resilience_options';
import type { AsyncFunction } from '../../../types/helpers';

export class CacheStrategy extends Strategy<ResilienceCacheOptions> {
  static #serializer: JsonSerializer = new JsonSerializer();

  static #defaultOptions: ResilienceCacheOptions = {
    persist: true,
    validityPeriod: '1m',
    gracePeriod: '1m',
    serialize: (request) => {
      const key = CacheStrategy.#serializer.serialize(request);

      if (key.isFailure())
        throw new Error(`Failed to serialize request: ${key.error.message}`);
      if (key.isSuccess() && !key.value)
        throw new Error(
          'Failed to serialize request: Serialized data is empty'
        );

      return key.value;
    },
    invalidate: false,
  };

  #cache: QueryCache;

  constructor(cache: QueryCache, options?: Partial<ResilienceCacheOptions>) {
    super({
      ...CacheStrategy.#defaultOptions,
      ...options,
    });

    this.#cache = cache;
  }

  async execute<
    TRequest,
    TTask extends AsyncFunction,
    TResult = ReturnType<TTask>
  >(request: TRequest, task: TTask): Promise<TResult> {
    const key = this.options.serialize(request);

    if (!this.options.invalidate) {
      const cachedEntry = await this.#cache.getEntry<TResult>(key);

      if (cachedEntry && !cachedEntry.isDefunct()) {
        if (cachedEntry.isStale()) {
          this.#refreshCache(request, task, key);
        }

        return cachedEntry.value as TResult;
      }
    }

    return this.#refreshCache(request, task, key);
  }

  async #refreshCache<TRequest, TTask extends AsyncFunction, TResult>(
    request: TRequest,
    task: TTask,
    key: string
  ): Promise<TResult> {
    const result = await task(request);
    await this.#cache.l1.set(key, result, this.options.validityPeriod);

    if (this.options.persist) {
      await this.#cache.l2.set(key, result, this.options.validityPeriod);
    }

    return result;
  }
}
