/* eslint-disable @typescript-eslint/no-explicit-any */
import { ttlToMilliseconds, type TTL } from '../../../utils/ttl';
import { CacheDriverContract } from '../cache-driver';

export class LocalStorageCacheDriver<TKey extends string, TValue>
  implements CacheDriverContract<TKey, TValue>
{
  static #instance: LocalStorageCacheDriver<string, any>;
  #storage: Storage;

  private constructor() {
    if (!window || !window.localStorage) {
      console.error('LocalStorage is not supported in this environment.');
      this.#storage = {
        getItem: () => null,
        setItem: () => null,
        removeItem: () => null,
        clear: () => null,
        key: () => null,
        length: 0,
      };
    } else {
      this.#storage = window.localStorage;
    }
  }

  static getInstance() {
    if (!this.#instance) {
      this.#instance = new LocalStorageCacheDriver();
    }

    return this.#instance;
  }

  get(key: TKey): TValue | undefined {
    try {
      const item = this.#storage.getItem(key.toString());

      if (!item) {
        return undefined;
      }

      const { value, expiration } = JSON.parse(item);

      if (expiration && this.#hasExpired(expiration)) {
        this.#storage.removeItem(key.toString());
        return undefined;
      }

      return value;
    } catch (error) {
      console.error('Error while retrieving item from LocalStorage:', error);
      return undefined;
    }
  }

  set(key: TKey, value: TValue, ttl?: TTL): void {
    try {
      const expiration = ttl ? Date.now() + ttlToMilliseconds(ttl) : undefined;

      this.#storage.setItem(
        key.toString(),
        JSON.stringify({ value, expiration })
      );
    } catch (error) {
      console.error('Error while setting item in LocalStorage:', error);
    }
  }

  delete(key: TKey): void {
    try {
      this.#storage.removeItem(key.toString());
    } catch (error) {
      console.error('Error while deleting item from LocalStorage:', error);
    }
  }

  #hasExpired = (expiration: number) => Date.now() > expiration;
}
