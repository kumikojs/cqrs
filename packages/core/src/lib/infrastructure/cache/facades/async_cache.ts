import type { NullablePromise } from '../../../types/helpers';
import type { AsyncStorageDriver } from '../../../types/infrastructure/storage';

export class AsyncCache {
  #storage: AsyncStorageDriver;

  constructor(storage: AsyncStorageDriver) {
    this.#storage = storage;

    this.#open();
  }

  async getItem(key: string): NullablePromise<string> {
    return this.#storage.getItem(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    return this.#storage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    return this.#storage.removeItem(key);
  }

  async clear(): Promise<void> {
    return this.#storage.clear();
  }

  async key(index: number): NullablePromise<string> {
    const keys = await this.#storage.getAllKeys();
    return keys[index] ?? null;
  }

  async length(): Promise<number> {
    const length = await this.#storage.getAllKeys().then((keys) => keys.length);

    return length;
  }

  async #open(): Promise<void> {
    if (this.#storage.open) {
      return this.#storage.open();
    }
  }

  async disconnect(): Promise<void> {
    if (this.#storage.close) {
      return this.#storage.close();
    }
  }
}
