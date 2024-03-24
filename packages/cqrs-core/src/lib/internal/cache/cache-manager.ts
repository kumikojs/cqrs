import { InMemoryCacheDriver } from './drivers/in-memory-cache-driver';
import { LocalStorageCacheDriver } from './drivers/local-storage-cache-driver';

export class CacheManager {
  #inMemoryCache: InMemoryCacheDriver<string>;
  #localStorageCache: LocalStorageCacheDriver<string>;

  constructor() {
    this.#inMemoryCache = new InMemoryCacheDriver();
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
