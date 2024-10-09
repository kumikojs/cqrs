/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonSerializer } from '../../../utilities/serializer/json_serializer';
import { QueryCache } from '../../query/query_cache';
import { Strategy } from './base_strategy';

import type { CacheOptions } from '../../../types/core/options/resilience_options';
import type { AsyncFunction } from '../../../types/helpers';

export class CacheStrategy extends Strategy<CacheOptions> {
  static #serializer: JsonSerializer = new JsonSerializer();

  static #defaultOptions: CacheOptions = {
    persist: true,
    ttl: '5m',
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

  constructor(cache: QueryCache, options?: Partial<CacheOptions>) {
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
      const cachedValue = await this.#cache.get<TResult>(key);

      if (cachedValue) {
        return cachedValue;
      }
    }

    const result = await task(request);

    await this.#cache.l1.set(key, result, this.options.ttl);

    if (this.options.persist) {
      await this.#cache.l2.set(key, result, this.options.ttl);
    }

    return result;
  }
}
