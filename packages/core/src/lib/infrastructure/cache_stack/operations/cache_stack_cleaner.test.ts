import { CacheStackCleaner } from './cache_stack_cleaner';
import { Cache } from '../../cache/cache';
import { MemoryStorageDriver } from '../../storage/drivers/memory_storage';

describe('CacheStackCleaner', () => {
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

    cleaner = new CacheStackCleaner(layers, ['l1', 'l2']);
  });

  describe('delete', () => {
    it('should delete key from all layers', async () => {
      await l1Cache.set('test-key', 'value1');
      await l2Cache.set('test-key', 'value2');

      await cleaner.delete('test-key');

      const l1Result = await l1Cache.get<string>('test-key');
      const l2Result = await l2Cache.get<string>('test-key');

      expect(l1Result.data).toBeUndefined();
      expect(l2Result.data).toBeUndefined();
    });

    it('should handle missing keys gracefully', async () => {
      await expect(cleaner.delete('non-existent')).resolves.not.toThrow();
    });

    it('should delete in specific layer order', async () => {
      const order: string[] = [];
      await l1Cache.set('test-key', 'value1');
      await l2Cache.set('test-key', 'value2');

      const origL1Delete = l1Cache.delete.bind(l1Cache);
      const origL2Delete = l2Cache.delete.bind(l2Cache);

      l1Cache.delete = async (key: string) => {
        order.push('l1');
        return origL1Delete(key);
      };

      l2Cache.delete = async (key: string) => {
        order.push('l2');
        return origL2Delete(key);
      };

      await cleaner.delete('test-key');
      expect(order).toEqual(['l1', 'l2']);
    });

    it('should continue deletion if one layer fails', async () => {
      await l1Cache.set('test-key', 'value1');
      await l2Cache.set('test-key', 'value2');

      l1Cache.delete = async () => {
        throw new Error('Delete failed');
      };

      await cleaner.delete('test-key');
      const l2Result = await l2Cache.get<string>('test-key');
      expect(l2Result.data).toBeUndefined();
    });
  });
});
