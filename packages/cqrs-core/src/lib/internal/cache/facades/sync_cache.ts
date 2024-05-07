import { SyncStorage } from '../../storage/facades/sync_storage';

export class SyncCache {
  #storage: SyncStorage;

  constructor(storage: SyncStorage) {
    this.#storage = storage;

    this.#open();
  }

  getItem(key: string): string | null {
    return this.#storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    return this.#storage.setItem(key, value);
  }

  removeItem(key: string): void {
    return this.#storage.removeItem(key);
  }

  clear(): void {
    return this.#storage.clear();
  }

  key(index: number): string | null {
    return this.#storage.key(index);
  }

  get length(): number {
    return this.#storage.length;
  }

  #open(): void {
    if (this.#storage.open) {
      return this.#storage.open();
    }
  }

  disconnect(): void {
    if (this.#storage.close) {
      return this.#storage.close();
    }
  }
}
