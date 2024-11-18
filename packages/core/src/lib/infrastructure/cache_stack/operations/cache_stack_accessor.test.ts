import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheStackAccessor } from './cache_stack_accessor';
import { CacheStackWriter } from './cache_stack_writer';
import { CacheStackReader } from './cache_stack_reader';
import { CacheStackEmitter } from './cache_stack_emitter';
import { CacheStackCleaner } from './cache_stack_cleaner';
import { Cache } from '../../cache/cache';
import { MemoryStorageDriver } from '../../storage/drivers/memory_storage';

describe('CacheStackAccessor', () => {
  let accessor: CacheStackAccessor;
  let writer: CacheStackWriter;
  let reader: CacheStackReader;
  let emitter: CacheStackEmitter;
  let cleaner: CacheStackCleaner;
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

    const orderedLayers = ['l1', 'l2'];

    writer = new CacheStackWriter(layers, orderedLayers);
    reader = new CacheStackReader(layers, orderedLayers);
    emitter = new CacheStackEmitter(layers, orderedLayers);
    cleaner = new CacheStackCleaner(layers, orderedLayers);

    accessor = new CacheStackAccessor(layers, orderedLayers, {
      writer,
      reader,
      emitter,
      cleaner,
    });
  });

  afterEach(() => {
    l1Cache.disconnect();
    l2Cache.disconnect();
  });

  describe('getOrSet', () => {
    it('should set and get fresh value when no entry exists', async () => {
      const value = await accessor.getOrSet(
        'test-key',
        async () => 'fresh-value'
      );
      expect(value).toEqual({ data: 'fresh-value', isStale: false });

      const l1Result = await l1Cache.get<string>('test-key');
      const l2Result = await l2Cache.get<string>('test-key');
      expect(l1Result.data).toBe('fresh-value');
      expect(l2Result.data).toBe('fresh-value');
    });

    it('should handle deleted entries', async () => {
      await l1Cache.set('test-key', 'old-value', {
        validityPeriod: '0',
        cacheTime: '0',
      });

      const value = await accessor.getOrSet(
        'test-key',
        async () => 'fresh-value'
      );
      expect(value).toEqual({ data: 'fresh-value', isStale: false });

      const l1Result = await l1Cache.get<string>('test-key');
      expect(l1Result.data).toBe('fresh-value');
    });

    it('should handle stale-while-revalidate', async () => {
      await l1Cache.set('test-key', 'stale-value', {
        validityPeriod: '0',
        cacheTime: '1h',
      });

      const value = await accessor.getOrSet(
        'test-key',
        async () => 'fresh-value',
        { staleWhileRevalidate: true }
      );

      expect(value).toEqual({ data: 'stale-value', isStale: true });

      // Wait for background revalidation
      await new Promise((resolve) => setTimeout(resolve, 50));

      const l1Result = await l1Cache.get<string>('test-key');
      expect(l1Result.data).toBe('fresh-value');
    });

    it('should handle revalidation failure', async () => {
      await l1Cache.set('test-key', 'stale-value', {
        validityPeriod: '0',
        cacheTime: '1h',
      });

      const value = await accessor.getOrSet(
        'test-key',
        async () => {
          throw new Error('Factory failed');
        },
        { staleWhileRevalidate: true }
      );

      expect(value).toEqual({ data: 'stale-value', isStale: true });
    });

    it('should return fresh value for stale entries without staleWhileRevalidate', async () => {
      await l1Cache.set('test-key', 'stale-value', {
        validityPeriod: '0',
        cacheTime: '1h',
      });

      const value = await accessor.getOrSet(
        'test-key',
        async () => 'fresh-value'
      );
      expect(value).toEqual({ data: 'fresh-value', isStale: false });
    });

    it('should return valid entry without calling factory', async () => {
      await l1Cache.set('test-key', 'valid-value', {
        validityPeriod: '1h',
        cacheTime: '2h',
      });

      const factory = async () => {
        throw new Error('Should not be called');
      };
      const value = await accessor.getOrSet('test-key', factory);

      expect(value).toEqual({ data: 'valid-value', isStale: false });
    });
  });
});
