export class LockManager {
  private locks = new Map<string, Promise<void>>();
  private resolvers = new Map<string, () => void>();

  // Acquire a lock for the given key
  async lock(key: string): Promise<void> {
    const existingLock = this.locks.get(key);
    if (existingLock) {
      // Wait for the existing lock to be released
      await existingLock;
    }

    // Create a new lock with a resolver to release it later
    let resolveLock!: () => void;
    const newLock = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    this.locks.set(key, newLock);
    this.resolvers.set(key, resolveLock);
  }

  unlock(key: string): void {
    const resolver = this.resolvers.get(key);
    if (!resolver) {
      return;
    }

    resolver();
    this.locks.delete(key);
    this.resolvers.delete(key);
  }
}
