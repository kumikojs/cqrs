import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheStackWriter } from './cache_stack_writer';
import { Cache } from '../../cache/cache';
import { CacheEntry } from '../../cache/cache_entry/cache_entry';
import { MemoryStorageDriver } from '../../storage/drivers/memory_storage';

describe('CacheStackWriter', () => {
  let writer: CacheStackWriter;
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

    writer = new CacheStackWriter(layers, ['l1', 'l2']);
  });

  afterEach(() => {
    l1Cache.disconnect();
    l2Cache.disconnect();
  });

  describe('set', () => {
    it('should write value to all layers', async () => {
      await writer.set('key', 'value');

      const l1Result = await l1Cache.get<string>('key');
      const l2Result = await l2Cache.get<string>('key');

      expect(l1Result.data).toBe('value');
      expect(l2Result.data).toBe('value');
    });

    it('should respect custom validity periods', async () => {
      await writer.set('key', 'value', {
        validityPeriod: '30m',
        cacheTime: '1h',
      });

      const l1Entry = await l1Cache.getEntry<string>('key');
      expect(l1Entry?.validityPeriod).toBe('30m');
      expect(l1Entry?.cacheTime).toBe('1h');
    });

    it('should continue if one layer fails', async () => {
      const consoleError = vi.spyOn(console, 'error');
      l1Cache.set = async () => {
        throw new Error('Write failed');
      };

      await writer.set('key', 'value');

      const l2Result = await l2Cache.get<string>('key');
      expect(l2Result.data).toBe('value');
      expect(consoleError).toHaveBeenCalled();
    });

    it('should log error if all layers fail', async () => {
      const consoleError = vi.spyOn(console, 'error');
      l1Cache.set = async () => {
        throw new Error('Write failed');
      };
      l2Cache.set = async () => {
        throw new Error('Write failed');
      };

      await writer.set('key', 'value');

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to write to all cache layers'
      );
    });
  });

  describe('setEntry', () => {
    it('should write entry to all layers', async () => {
      const entry = new CacheEntry({
        key: 'key',
        value: 'value',
        validityPeriod: '1h',
        cacheTime: '2h',
      });

      await writer.setEntry('key', entry);

      const l1Entry = await l1Cache.getEntry<string>('key');
      const l2Entry = await l2Cache.getEntry<string>('key');

      expect(l1Entry?.value).toBe('value');
      expect(l2Entry?.value).toBe('value');
    });

    it('should preserve entry properties', async () => {
      const entry = new CacheEntry({
        key: 'key',
        value: 'value',
        validityPeriod: '30m',
        cacheTime: '1h',
      });

      await writer.setEntry('key', entry);

      const l1Entry = await l1Cache.getEntry<string>('key');
      const l2Entry = await l2Cache.getEntry<string>('key');

      expect(l1Entry?.validityPeriod).toBe('30m');
      expect(l1Entry?.cacheTime).toBe('1h');
      expect(l2Entry?.validityPeriod).toBe('30m');
      expect(l2Entry?.cacheTime).toBe('1h');
    });

    it('should handle layer failures gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error');
      const entry = new CacheEntry({
        key: 'key',
        value: 'value',
        validityPeriod: '1h',
        cacheTime: '2h',
      });

      l1Cache.setEntry = async () => {
        throw new Error('Write failed');
      };
      await writer.setEntry('key', entry);

      const l2Entry = await l2Cache.getEntry<string>('key');
      expect(l2Entry?.value).toBe('value');
      expect(consoleError).toHaveBeenCalled();
    });
  });
});
