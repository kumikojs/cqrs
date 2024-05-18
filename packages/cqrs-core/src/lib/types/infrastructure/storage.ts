/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Interface defining the contract for a synchronous storage provider.
 * Represents a storage provider capable of handling synchronous read and write operations.
 */
export interface SyncStorageDriver {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  get length(): number;
  open?(): void;
  close?(): void;
}

/**
 * Interface defining the contract for an asynchronous storage provider.
 * Represents a storage provider capable of handling asynchronous read and write operations.
 */
export interface AsyncStorageDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
  getAllKeys(): Promise<string[]>;
  open?(): Promise<any>;
  close?(): Promise<void>;
}
