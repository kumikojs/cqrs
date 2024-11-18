import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheStackEmitter } from './cache_stack_emitter';
import { Cache, CACHE_EVENT_TYPES } from '../../cache/cache';
import { MemoryStorageDriver } from '../../storage/drivers/memory_storage';

describe('CacheStackEmitter', () => {
  let emitter: CacheStackEmitter;
  let l1Cache: Cache;
  let l2Cache: Cache;
  let l1Storage: MemoryStorageDriver;
  let l2Storage: MemoryStorageDriver;

  beforeEach(() => {
    l1Storage = new MemoryStorageDriver();
    l2Storage = new MemoryStorageDriver();

    l1Cache = new Cache({
      name: 'l1',
      storage: l1Storage,
      validityPeriod: '1h',
      cacheTime: '2h',
    });

    l2Cache = new Cache({
      name: 'l2',
      storage: l2Storage,
      validityPeriod: '2h',
      cacheTime: '4h',
    });

    const layers = new Map([
      ['l1', l1Cache],
      ['l2', l2Cache],
    ]);

    emitter = new CacheStackEmitter(layers, ['l1', 'l2']);
  });

  afterEach(() => {
    emitter.disconnect();
  });

  describe('emit', () => {
    it('should emit events to all layers', async () => {
      const l1Handler = new Promise<string>((resolve) =>
        l1Cache.on(CACHE_EVENT_TYPES.REMOVED, (key) => resolve(key))
      );
      const l2Handler = new Promise<string>((resolve) =>
        l2Cache.on(CACHE_EVENT_TYPES.REMOVED, (key) => resolve(key))
      );

      emitter.emit(CACHE_EVENT_TYPES.REMOVED, 'test-key');

      const [l1Key, l2Key] = await Promise.all([l1Handler, l2Handler]);
      expect(l1Key).toBe('test-key');
      expect(l2Key).toBe('test-key');
    });
  });

  describe('on', () => {
    it('should subscribe to events from all layers', async () => {
      const receivedEvents: string[] = [];
      const unsubscribe = emitter.on(CACHE_EVENT_TYPES.REMOVED, (key) => {
        receivedEvents.push(key);
      });

      await l1Cache.delete('key1');
      await l2Cache.delete('key2');

      expect(receivedEvents).toContain('key1');
      expect(receivedEvents).toContain('key2');

      unsubscribe();
    });

    it('should handle unsubscription correctly', async () => {
      const receivedEvents: string[] = [];
      const unsubscribe = emitter.on(CACHE_EVENT_TYPES.REMOVED, (key) => {
        receivedEvents.push(key);
      });

      unsubscribe();

      await l1Cache.delete('key1');
      await l2Cache.delete('key2');

      expect(receivedEvents).toHaveLength(0);
    });

    it('should handle missing layers gracefully', () => {
      const emitter = new CacheStackEmitter(new Map(), []);
      const unsubscribe = emitter.on(CACHE_EVENT_TYPES.REMOVED, () => {
        throw new Error('Should not be called');
      });
      expect(() => unsubscribe()).not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should disconnect all layers', () => {
      const receivedEvents: string[] = [];
      emitter.on(CACHE_EVENT_TYPES.REMOVED, (key) => {
        receivedEvents.push(key);
      });

      emitter.disconnect();

      emitter.emit(CACHE_EVENT_TYPES.REMOVED, 'test-key');
      expect(receivedEvents).toHaveLength(0);
    });

    it('should handle failures gracefully', () => {
      const badCache = {
        disconnect: () => {
          throw new Error('Disconnect failed');
        },
      } as unknown as Cache;

      const emitter = new CacheStackEmitter(new Map([['bad', badCache]]), [
        'bad',
      ]);

      expect(() => emitter.disconnect()).not.toThrow();
    });
  });
});
