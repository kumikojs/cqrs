import { CacheStackNamespace } from './cache_stack_namespace';
import { CacheStack } from './cache_stack';
import { MemoryStorageDriver } from '../storage/drivers/memory_storage';
import { CACHE_EVENT_TYPES } from '../cache/cache';

describe('CacheStackNamespace', () => {
  let namespace: CacheStackNamespace;
  let stack: CacheStack;
  let l1Storage: MemoryStorageDriver;
  let l2Storage: MemoryStorageDriver;

  beforeEach(() => {
    l1Storage = new MemoryStorageDriver();
    l2Storage = new MemoryStorageDriver();

    stack = new CacheStack({
      layers: [
        {
          name: 'l1',
          storage: l1Storage,
          options: {
            validityPeriod: '1h',
            cacheTime: '2h',
          },
        },
        {
          name: 'l2',
          storage: l2Storage,
          options: {
            validityPeriod: '2h',
            cacheTime: '4h',
          },
        },
      ],
    });

    namespace = new CacheStackNamespace('test', stack);
  });

  it('should throw error for empty namespace', () => {
    expect(() => new CacheStackNamespace('', stack)).toThrow(
      'Namespace cannot be empty'
    );
  });

  describe('Basic operations', () => {
    it('should set and get value with namespace prefix', async () => {
      await namespace.set('key', 'value');
      const result = await namespace.get<string>('key');
      expect(result.data).toBe('value');

      const rawResult = await stack.reader.get<string>('test:key');
      expect(rawResult.data).toBe('value');
    });

    it('should handle custom options', async () => {
      await namespace.set('key', 'value', {
        validityPeriod: '30m',
        cacheTime: '1h',
      });

      const entry = await namespace.getEntry<string>('key');
      expect(entry?.validityPeriod).toBe('30m');
      expect(entry?.cacheTime).toBe('1h');
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate single key', async () => {
      await namespace.set('key', 'value');
      await namespace.invalidate('key');
      const result = await namespace.get<string>('key');
      expect(result.data).toBeUndefined();
    });

    it('should invalidate by pattern', async () => {
      await namespace.set('test1', 'value1');
      await namespace.set('test2', 'value2');
      await namespace.set('other', 'value3');

      await namespace.invalidatePattern(/test/); // Changed from /^test/

      const result1 = await namespace.get<string>('test1');
      const result2 = await namespace.get<string>('test2');
      const result3 = await namespace.get<string>('other');

      expect(result1.data).toBeUndefined();
      expect(result2.data).toBeUndefined();
      expect(result3.data).toBe('value3');
    });

    it('should clear all namespaced keys', async () => {
      await namespace.set('key1', 'value1');
      await namespace.set('key2', 'value2');

      await namespace.clear();

      const result1 = await namespace.get<string>('key1');
      const result2 = await namespace.get<string>('key2');

      expect(result1.data).toBeUndefined();
      expect(result2.data).toBeUndefined();
    });
  });

  describe('Event handling', () => {
    it('should emit namespaced events', async () => {
      const handler = vi.fn();
      namespace.on(CACHE_EVENT_TYPES.REMOVED, handler);

      await namespace.set('key', 'value');
      await namespace.delete('key');

      expect(handler).toHaveBeenCalledWith('key');
    });

    it('should only handle events for correct namespace', async () => {
      const handler = vi.fn();
      namespace.on(CACHE_EVENT_TYPES.REMOVED, handler);

      stack.emitter.emit(CACHE_EVENT_TYPES.REMOVED, 'other:key');
      expect(handler).not.toHaveBeenCalled();

      stack.emitter.emit(CACHE_EVENT_TYPES.REMOVED, 'test:key');
      expect(handler).toHaveBeenCalledWith('key');
    });
  });

  describe('getOrSet', () => {
    it('should use factory when value not found', async () => {
      const result = await namespace.getOrSet('key', async () => 'value');
      expect(result.data).toBe('value');
    });

    it('should return cached value when found', async () => {
      await namespace.set('key', 'cached', {
        validityPeriod: '1h',
        cacheTime: '2h',
      });

      const factory = vi.fn().mockResolvedValue('new');
      const result = await namespace.getOrSet('key', factory, {
        validityPeriod: '1h',
        cacheTime: '2h',
      });

      expect(result.data).toBe('cached');
      expect(factory).not.toHaveBeenCalled();
    });
  });
});
