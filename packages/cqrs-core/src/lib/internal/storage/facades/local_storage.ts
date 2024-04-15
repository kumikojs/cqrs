import { MemoryStorage } from './memory_storage';

import type { Storage } from '../storage';

export class LocalStorage implements Storage {
  #storage: Storage;

  constructor() {
    if (!window || !window.localStorage) {
      this.#storage = new MemoryStorage();
    } else {
      this.#storage = window.localStorage;
    }
  }

  get length(): number {
    return this.#storage.length;
  }

  getItem(key: string): string | null {
    return this.#storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.#storage.setItem(key, value);
  }

  removeItem(key: string): void {
    this.#storage.removeItem(key);
  }

  clear(): void {
    this.#storage.clear();
  }

  key(index: number): string | null {
    return this.#storage.key(index);
  }
}
