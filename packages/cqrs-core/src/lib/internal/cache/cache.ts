import { MemoryCacheDriver } from './drivers/memory_cache';
import { LocalStorageCacheDriver } from './drivers/local_storage_cache';

export class Cache {
  #inMemoryCache: MemoryCacheDriver<string>;
  #localStorageCache: LocalStorageCacheDriver<string>;

  constructor() {
    this.#inMemoryCache = new MemoryCacheDriver();
    this.#localStorageCache = new LocalStorageCacheDriver();
  }

  get inMemoryCache() {
    return this.#inMemoryCache;
  }

  get localStorageCache() {
    return this.#localStorageCache;
  }

  invalidate(key: string) {
    this.#inMemoryCache.delete(key);
    this.#localStorageCache.delete(key);
  }

  onInvalidate(key: string, handler: (key: string) => void) {
    const memorySubscription = this.#inMemoryCache.onInvalidate(key, handler);
    const localStorageSubscription = this.#localStorageCache.onInvalidate(
      key,
      handler
    );

    return () => {
      memorySubscription();
      localStorageSubscription();
    };
  }
}
