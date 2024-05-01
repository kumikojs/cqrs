import { Cache } from '../../internal/cache/cache';
import { LocalStorage } from '../../internal/storage/adapters/local_storage';
import { MemoryStorageDriver } from '../../internal/storage/drivers/memory_storage';
import { QueryCache } from '../../query/query_cache';
import { CacheStrategy } from './cache_strategy';

describe('CacheStrategy', () => {
  let cacheStrategy: CacheStrategy;

  test('should cache and retrieve values correctly', async () => {
    cacheStrategy = new CacheStrategy(
      new QueryCache(
        new Cache(new MemoryStorageDriver()),
        new Cache(new LocalStorage())
      )
    );

    const request = { key: 'value' };
    const task = vitest.fn().mockResolvedValue('result');

    let result = await cacheStrategy.execute(request, task);
    expect(task).toHaveBeenCalledTimes(1);
    expect(result).toEqual('result');

    result = await cacheStrategy.execute(request, task);
    expect(task).toHaveBeenCalledTimes(1);
    expect(result).toEqual('result');
  });

  test('should use custom TTL when provided', async () => {
    vitest.useFakeTimers();
    cacheStrategy = new CacheStrategy(
      new QueryCache(
        new Cache(new MemoryStorageDriver()),
        new Cache(new LocalStorage())
      ),
      { ttl: 1000 }
    );
    const request = { key: 'value' };
    const task = vitest.fn().mockResolvedValue('result');

    let result = await cacheStrategy.execute(request, task);
    expect(result).toEqual('result');

    result = await cacheStrategy.execute(request, task);
    expect(result).toEqual('result');

    vitest.advanceTimersByTime(2000);

    result = await cacheStrategy.execute(request, task);
    expect(task).toHaveBeenCalledTimes(2);
    expect(result).toEqual('result');
  });
});
