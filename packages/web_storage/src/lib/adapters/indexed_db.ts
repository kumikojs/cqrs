import type { AsyncStorageDriver } from '@stoik/cqrs-core/types';

/**
 * Represents a storage implementation using IndexedDB.
 */
export class IndexedDBAdapter implements AsyncStorageDriver {
  #db: IDBDatabase | null = null;
  #dbName: string;
  #storeName: string;

  constructor(dbName: string, storeName: string) {
    this.#dbName = dbName;
    this.#storeName = storeName;
  }

  /**
   * Retrieves the value associated with the specified key from the IndexedDB store.
   *
   * @param key - The key of the item to retrieve.
   * @returns A promise that resolves with the retrieved value, or null if the key does not exist.
   */
  async getItem(key: string): Promise<string | null> {
    const db = await this.open();

    const transaction = db.transaction(this.#storeName, 'readonly');
    const store = transaction.objectStore(this.#storeName);
    const cursor = store.openCursor(IDBKeyRange.only(key));

    return new Promise((resolve, reject) => {
      cursor.onsuccess = () => {
        if (cursor.result) {
          resolve(cursor.result.value);
        } else {
          resolve(null);
        }
      };

      cursor.onerror = () => {
        reject(cursor.error);
      };
    });
  }

  /**
   * Sets the value for the specified key in the IndexedDB storage.
   *
   * @param key - The key to set the value for.
   * @param value - The value to be set.
   * @returns A promise that resolves when the value is successfully set, or rejects with an error if an error occurs.
   */
  async setItem(key: string, value: string): Promise<void> {
    const db = await this.open();

    const transaction = db.transaction(this.#storeName, 'readwrite');
    const store = transaction.objectStore(this.#storeName);

    return new Promise((resolve, reject) => {
      const request = store.put(value, key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Removes an item from the IndexedDB storage.
   *
   * @param key - The key of the item to be removed.
   * @returns A promise that resolves when the item is successfully removed.
   * @throws If there is an error while removing the item.
   */
  async removeItem(key: string): Promise<void> {
    const db = await this.open();

    const transaction = db.transaction(this.#storeName, 'readwrite');
    const store = transaction.objectStore(this.#storeName);

    return new Promise((resolve, reject) => {
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Clears all data from the IndexedDB storage.
   *
   * @returns A promise that resolves when the data is cleared successfully, or rejects with an error if an error occurs.
   */
  async clear(): Promise<void> {
    const db = await this.open();

    const transaction = db.transaction(this.#storeName, 'readwrite');
    const store = transaction.objectStore(this.#storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Returns all keys in the IndexedDB storage.
   *
   * @returns A promise that resolves to an array of keys.
   */
  async getAllKeys(): Promise<string[]> {
    const db = await this.open();

    const transaction = db.transaction(this.#storeName, 'readonly');
    const store = transaction.objectStore(this.#storeName);
    const request = store.getAllKeys();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        resolve(request.result.map((key) => key.toString()));
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Opens the IndexedDB database and returns a promise that resolves to the IDBDatabase instance.
   * If the database is already open, it returns the existing instance.
   * If the database does not exist, it creates a new one and sets up the required object store and index.
   *
   * @returns A promise that resolves to the IDBDatabase instance.
   */
  async open(): Promise<IDBDatabase> {
    if (this.#db) {
      return this.#db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#dbName);

      request.onupgradeneeded = () => {
        const db = request.result;

        if (!db.objectStoreNames.contains(this.#storeName)) {
          db.createObjectStore(this.#storeName);
        }
      };

      request.onsuccess = () => {
        this.#db = request.result;
        resolve(this.#db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Closes the IndexedDB database connection.
   */
  async close(): Promise<void> {
    if (this.#db) {
      this.#db.close();
      this.#db = null;
    }
  }
}
