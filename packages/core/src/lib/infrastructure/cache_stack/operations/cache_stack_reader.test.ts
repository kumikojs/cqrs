import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheStackReader } from './cache_stack_reader';
import { Cache } from '../../cache/cache';
import { MemoryStorageDriver } from '../../storage/drivers/memory_storage';

describe('CacheStackReader', () => {
  let reader: CacheStackReader;
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

    reader = new CacheStackReader(layers, ['l1', 'l2']);
  });

  afterEach(() => {
    l1Cache.disconnect();
    l2Cache.disconnect();
  });

  describe('get', () => {
    it('should return undefined for non-existent key', async () => {
      const result = await reader.get('non-existent');
      expect(result).toEqual({ data: undefined, isStale: false });
    });

    it('should read from first layer if exists', async () => {
      await l1Cache.set('key', 'l1-value');
      await l2Cache.set('key', 'l2-value');

      const result = await reader.get<string>('key');
      expect(result.data).toBe('l1-value');
    });

    it('should fall through to second layer if not in first', async () => {
      await l2Cache.set('key', 'l2-value');

      const result = await reader.get<string>('key');
      expect(result.data).toBe('l2-value');
    });

    it('should promote entry to higher layers', async () => {
      await l2Cache.set('key', 'value');
      await reader.get('key');

      const l1Result = await l1Cache.get<string>('key');
      expect(l1Result.data).toBe('value');
    });

    it('should handle layer failures gracefully', async () => {
      await l2Cache.set('key', 'l2-value');
      l1Cache.get = async () => {
        throw new Error('Layer failed');
      };

      const result = await reader.get<string>('key');
      expect(result.data).toBe('l2-value');
    });
  });

  describe('getEntry', () => {
    it('should return undefined for non-existent key', async () => {
      const entry = await reader.getEntry('non-existent');
      expect(entry).toBeUndefined();
    });

    it('should preserve entry properties during promotion', async () => {
      await l2Cache.set('key', 'value', {
        validityPeriod: '30m',
        cacheTime: '1h',
      });

      await reader.getEntry('key');

      const l1Entry = await l1Cache.getEntry<string>('key');
      expect(l1Entry?.validityPeriod).toBe('30m');
      expect(l1Entry?.cacheTime).toBe('1h');
    });

    it('should handle stale entries', async () => {
      await l2Cache.set('key', 'value', {
        validityPeriod: '0',
        cacheTime: '1h',
      });

      const entry = await reader.getEntry<string>('key');
      expect(entry?.isStale()).toBe(true);
    });
  });

  describe('entry promotion', () => {
    it('should promote in correct order', async () => {
      const order: string[] = [];
      await l2Cache.set('key', 'value');

      const originalSetEntry = l1Cache.setEntry;
      l1Cache.setEntry = async (...args) => {
        order.push('l1');
        return originalSetEntry.apply(l1Cache, args);
      };

      await reader.get('key');
      expect(order).toEqual(['l1']);
    });

    it('should continue if promotion to a layer fails', async () => {
      await l2Cache.set('key', 'value');
      l1Cache.setEntry = async () => {
        throw new Error('Promotion failed');
      };

      await expect(reader.get('key')).resolves.toEqual({
        data: 'value',
        isStale: false,
      });
    });
  });
});
