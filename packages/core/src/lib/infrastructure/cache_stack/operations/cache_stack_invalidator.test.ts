import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheStackInvalidator } from './cache_stack_invalidator';
import { Cache } from '../../cache/cache';
import { MemoryStorageDriver } from '../../storage/drivers/memory_storage';

describe('CacheStackInvalidator', () => {
  let invalidator: CacheStackInvalidator;
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

    invalidator = new CacheStackInvalidator(layers, ['l1', 'l2']);
  });

  afterEach(() => {
    l1Cache.disconnect();
    l2Cache.disconnect();
  });

  describe('invalidate', () => {
    it('should invalidate entry in all layers', async () => {
      await l1Cache.set('test-key', 'value1');
      await l2Cache.set('test-key', 'value2');

      await invalidator.invalidate('test-key');

      const l1Result = await l1Cache.get<string>('test-key');
      const l2Result = await l2Cache.get<string>('test-key');

      expect(l1Result.data).toBeUndefined();
      expect(l2Result.data).toBeUndefined();
    });

    it('should handle non-existent keys', async () => {
      await expect(
        invalidator.invalidate('non-existent')
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateMany', () => {
    it('should invalidate multiple keys', async () => {
      await l1Cache.set('key1', 'value1');
      await l1Cache.set('key2', 'value2');
      await l2Cache.set('key1', 'value3');
      await l2Cache.set('key2', 'value4');

      await invalidator.invalidateMany(['key1', 'key2']);

      const results = await Promise.all([
        l1Cache.get('key1'),
        l1Cache.get('key2'),
        l2Cache.get('key1'),
        l2Cache.get('key2'),
      ]);

      results.forEach((result) => {
        expect(result.data).toBeUndefined();
      });
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate keys matching pattern', async () => {
      await l1Cache.set('test:1', 'value1');
      await l1Cache.set('test:2', 'value2');
      await l1Cache.set('other:1', 'value3');
      await l2Cache.set('test:1', 'value4');
      await l2Cache.set('test:2', 'value5');
      await l2Cache.set('other:1', 'value6');

      await invalidator.invalidatePattern(/^test:/);

      expect((await l1Cache.get('test:1')).data).toBeUndefined();
      expect((await l1Cache.get('test:2')).data).toBeUndefined();
      expect((await l1Cache.get('other:1')).data).toBeDefined();
      expect((await l2Cache.get('test:1')).data).toBeUndefined();
      expect((await l2Cache.get('test:2')).data).toBeUndefined();
      expect((await l2Cache.get('other:1')).data).toBeDefined();
    });
  });

  describe('invalidateStale', () => {
    it('should invalidate only stale entries', async () => {
      await l1Cache.set('fresh', 'value1', {
        validityPeriod: '1h',
        cacheTime: '2h',
      });

      await l1Cache.set('stale', 'value2', {
        validityPeriod: '0',
        cacheTime: '1h',
      });

      await invalidator.invalidateStale();

      const freshResult = await l1Cache.get('fresh');
      const staleResult = await l1Cache.get('stale');

      expect(freshResult.data).toBeDefined();
      expect(staleResult.data).toBeUndefined();
    });

    it('should ignore entries marked for deletion during stale invalidation', async () => {
      await l1Cache.set('key', 'value', {
        validityPeriod: '0',
        cacheTime: '0',
      });

      await invalidator.invalidateStale();

      const result = await l1Cache.get('key');
      expect(result.data).toBeUndefined();
    });
  });
});
