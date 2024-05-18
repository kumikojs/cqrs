import type { SyncStorageDriver } from '../../../types/infrastructure/storage';

export class MemoryStorageDriver implements SyncStorageDriver {
  #storage: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.#storage).length;
  }

  getItem(key: string): string | null {
    return this.#storage[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.#storage[key] = value;
  }

  removeItem(key: string): void {
    delete this.#storage[key];
  }

  clear(): void {
    this.#storage = {};
  }

  key(index: number): string | null {
    return Object.keys(this.#storage)[index] ?? null;
  }
}
