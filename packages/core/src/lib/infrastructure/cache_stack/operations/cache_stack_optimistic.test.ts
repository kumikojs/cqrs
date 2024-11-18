import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheStackOptimistic } from './cache_stack_optimistic';
import { CacheStackWriter } from './cache_stack_writer';
import { CacheStackReader } from './cache_stack_reader';
import { CacheStackEmitter } from './cache_stack_emitter';
import { CacheStackInvalidator } from './cache_stack_invalidator';
import { Cache } from '../../cache/cache';
import { MemoryStorageDriver } from '../../storage/drivers/memory_storage';

describe('CacheStackOptimistic', () => {
  let optimistic: CacheStackOptimistic;
  let writer: CacheStackWriter;
  let reader: CacheStackReader;
  let emitter: CacheStackEmitter;
  let invalidator: CacheStackInvalidator;
  let l1Cache: Cache;
  let l2Cache: Cache;

  beforeEach(() => {
    const l1Storage = new MemoryStorageDriver();
    const l2Storage = new MemoryStorageDriver();

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
    invalidator = new CacheStackInvalidator(layers, orderedLayers);

    optimistic = new CacheStackOptimistic(layers, orderedLayers, {
      writer,
      reader,
      emitter,
      invalidator,
    });
  });

  afterEach(() => {
    l1Cache.disconnect();
    l2Cache.disconnect();
  });

  describe('update', () => {
    it('should handle optimistic updates with value', async () => {
      const optimisticData = 'optimistic';
      const finalData = 'final';
      const events: string[] = [];

      emitter.on('cache:optimistic:update', (key) =>
        events.push(`update:${key}`)
      );

      const result = await optimistic.update('key', async () => finalData, {
        optimisticData,
      });

      expect(result).toBe(finalData);
      const finalCacheResult = await reader.get<string>('key');
      expect(finalCacheResult.data).toBe(finalData);
      expect(events).toContain('update:key');
    });

    it('should handle optimistic updates with function', async () => {
      await writer.set('key', 'initial');

      const result = await optimistic.update('key', async () => 'final', {
        optimisticData: (prev) => `${prev}-optimistic`,
      });

      expect(result).toBe('final');
    });

    it('should apply transform function', async () => {
      const result = await optimistic.update('key', async () => 42, {
        transform: (value) => value * 2,
      });

      expect(result).toBe(42);
      const cacheResult = await reader.get<number>('key');
      expect(cacheResult.data).toBe(84);
    });

    it('should handle callbacks', async () => {
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const onSettled = vi.fn();
      const context = { id: 1 };

      await optimistic.update('key', async () => 'value', {
        onSuccess,
        onError,
        onSettled,
        context,
      });

      expect(onSuccess).toHaveBeenCalledWith('value', context);
      expect(onSettled).toHaveBeenCalledWith('value', undefined, context);
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle errors and rollback', async () => {
      const events: string[] = [];
      emitter.on('cache:optimistic:rollback', (key) =>
        events.push(`rollback:${key}`)
      );

      await writer.set('key', 'initial');

      await expect(
        optimistic.update(
          'key',
          async () => {
            throw new Error('Operation failed');
          },
          { optimisticData: 'optimistic' }
        )
      ).rejects.toThrow('Operation failed');

      const cacheResult = await reader.get<string>('key');
      expect(cacheResult.data).toBe('initial');
      expect(events).toContain('rollback:key');
    });
  });

  describe('delete', () => {
    it('should handle successful deletion', async () => {
      await writer.set('key', 'value');
      const onSuccess = vi.fn();
      const events: string[] = [];

      emitter.on('cache:optimistic:delete', (key) =>
        events.push(`delete:${key}`)
      );

      await optimistic.delete(
        'key',
        async () => {
          return;
        },
        { onSuccess }
      );

      const cacheResult = await reader.get('key');
      expect(cacheResult.data).toBeUndefined();
      expect(onSuccess).toHaveBeenCalled();
      expect(events).toContain('delete:key');
    });

    it('should handle deletion failure and rollback', async () => {
      await writer.set('key', 'value');
      const onError = vi.fn();
      const events: string[] = [];

      emitter.on('cache:optimistic:rollback', (key) =>
        events.push(`rollback:${key}`)
      );

      await expect(
        optimistic.delete(
          'key',
          async () => {
            throw new Error('Operation failed');
          },
          { onError }
        )
      ).rejects.toThrow('Operation failed');

      const cacheResult = await reader.get<string>('key');
      expect(cacheResult.data).toBe('value');
      expect(onError).toHaveBeenCalled();
      expect(events).toContain('rollback:key');
    });
  });
});
