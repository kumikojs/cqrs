import { CacheStrategy } from './cache_strategy';
import { QueryCache } from '../../query/query_cache';
import { MemoryStorageDriver } from '../../../infrastructure/storage/drivers/memory_storage';
import { JsonSerializer } from '../../../utilities/serializer/json_serializer';

describe('CacheStrategy', () => {
  let cacheStrategy: CacheStrategy;
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache({
      l2: { driver: new MemoryStorageDriver() },
    });
    cacheStrategy = new CacheStrategy(cache);
  });

  test('should cache and retrieve task result', async () => {
    const request = { key: 'value' };
    const task = vitest.fn().mockResolvedValue('result');

    let result = await cacheStrategy.execute(request, task);
    expect(task).toHaveBeenCalledTimes(1);
    expect(result).toEqual('result');

    // Fetch again, this time it should retrieve from cache
    result = await cacheStrategy.execute(request, task);
    expect(task).toHaveBeenCalledTimes(1); // Task shouldn't run again
    expect(result).toEqual('result');
  });

  test('should execute task again if invalidate option is true', async () => {
    cacheStrategy = new CacheStrategy(cache, { invalidate: true });

    const request = { key: 'value' };
    const task = vitest.fn().mockResolvedValue('result');

    let result = await cacheStrategy.execute(request, task);
    expect(task).toHaveBeenCalledTimes(1);
    expect(result).toEqual('result');

    // With invalidate true, the task should run again
    result = await cacheStrategy.execute(request, task);
    expect(task).toHaveBeenCalledTimes(2);
    expect(result).toEqual('result');
  });

  test('should persist to both L1 and L2 cache layers', async () => {
    const request = { key: 'value' };
    const task = vitest.fn().mockResolvedValue('result');

    await cacheStrategy.execute(request, task);

    const serializedRequest = new JsonSerializer().serialize(request);
    const serializedKey = serializedRequest.isSuccess()
      ? serializedRequest.value
      : '';

    const l1Value = await cache.l1.get(serializedKey);
    const l2Value = await cache.l2.get(serializedKey);

    expect(l1Value).toEqual('result');
    expect(l2Value).toEqual('result');
  });

  test('should throw an error if serialization fails', async () => {
    const invalidRequest = undefined; // Serializer expected to fail on empty object
    const task = vitest.fn().mockResolvedValue('result');

    await expect(cacheStrategy.execute(invalidRequest, task)).rejects.toThrow(
      'Failed to serialize request'
    );

    expect(task).not.toHaveBeenCalled(); // Task shouldn't execute on serialization failure
  });

  test('should handle custom TTL when provided', async () => {
    vitest.useFakeTimers();
    cacheStrategy = new CacheStrategy(cache, { ttl: 1000 });

    const request = { key: 'value' };
    const task = vitest.fn().mockResolvedValue('result');

    let result = await cacheStrategy.execute(request, task);
    expect(result).toEqual('result');

    // Advance timers to expire TTL
    vitest.advanceTimersByTime(2000);

    // Execute task again after TTL expires
    result = await cacheStrategy.execute(request, task);
    expect(task).toHaveBeenCalledTimes(2);
    expect(result).toEqual('result');
  });
});
