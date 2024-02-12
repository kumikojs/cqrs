/* eslint-disable @typescript-eslint/no-explicit-any */

import { InMemoryCacheDriver } from './drivers/in-memory-cache-driver';
import { LocalStorageCacheDriver } from './drivers/local-storage-cache-driver';

export class CacheManager {
  static #instance: CacheManager;

  #inMemoryCache: InMemoryCacheDriver<string>;
  #localStorageCache: LocalStorageCacheDriver<string>;

  private constructor() {
    this.#inMemoryCache = new InMemoryCacheDriver();
    this.#localStorageCache = new LocalStorageCacheDriver();
  }

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new CacheManager();
    }

    return this.#instance;
  }

  get inMemoryCache() {
    return this.#inMemoryCache;
  }

  get localStorageCache() {
    return this.#localStorageCache;
  }
}
