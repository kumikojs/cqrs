import { describe, it, expect, vi } from 'vitest';
import { LockManager } from './lock_manager';

describe('LockManager', () => {
  it('should acquire and release a lock', async () => {
    const lockManager = new LockManager();
    await lockManager.lock('key1');

    expect(() => lockManager.unlock('key1')).not.toThrow();
  });

  it('should wait for the existing lock to be released', async () => {
    const lockManager = new LockManager();
    const mockFn = vi.fn();

    lockManager.lock('key1').then(() => mockFn('lock1 released'));

    // Attempt to acquire lock while it's still held
    const lockPromise = lockManager
      .lock('key1')
      .then(() => mockFn('lock2 acquired'));

    // Ensure that lock2 will only be acquired after lock1 is released
    expect(mockFn).not.toHaveBeenCalledWith('lock2 acquired');

    // Unlock the first lock to allow the second one
    lockManager.unlock('key1');
    await lockPromise; // Wait for lock2 to resolve

    // After unlocking, both locks should have been acquired and released
    expect(mockFn).toHaveBeenNthCalledWith(1, 'lock1 released');
    expect(mockFn).toHaveBeenNthCalledWith(2, 'lock2 acquired');
  });

  it('should gracefully handle unlocking a nonexistent key', () => {
    const lockManager = new LockManager();

    expect(() => lockManager.unlock('nonexistentKey')).not.toThrow();
  });

  it('should allow locking the same key multiple times sequentially and handle race conditions', async () => {
    const lockManager = new LockManager();
    const mockFn = vi.fn();

    // Acquire the lock initially
    await lockManager.lock('key1');

    // Start two concurrent attempts to lock the same key
    const lockPromises = Promise.all([
      lockManager.lock('key1').then(() => mockFn('lock1 acquired')),
      lockManager.lock('key1').then(() => mockFn('lock2 acquired')),
    ]);

    // Wait for both attempts to finish
    await new Promise((resolve) => setTimeout(resolve, 100)); // Slight delay to allow locks to settle

    // Now unlock the first lock to allow others to proceed
    lockManager.unlock('key1');

    // Wait for the lock promises to resolve
    await lockPromises;

    // Check if both locks were acquired successfully
    expect(mockFn).toHaveBeenCalledWith('lock1 acquired');
    expect(mockFn).toHaveBeenCalledWith('lock2 acquired');
  });
});
