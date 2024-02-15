import type { CacheDriverContract } from '../internal/cache/cache-driver';
import { CacheManager } from '../internal/cache/cache-manager';
import { ThrottleStrategy } from './throttle-strategy';

describe('ThrottleStrategy', () => {
  let cache: CacheDriverContract<string>;

  beforeEach(() => {
    cache = new CacheManager().inMemoryCache;
    vitest.spyOn(cache, 'get').mockReturnValue(undefined);
    vitest.spyOn(cache, 'set');
  });

  afterEach(() => {
    vitest.clearAllMocks();
  });

  test('should execute the task when there is no cached value', async () => {
    const strategy = new ThrottleStrategy(cache, { ttl: '5s', limit: 5 });
    const request = {};
    const task = vitest.fn().mockResolvedValue('result');

    await strategy.execute(request, task);

    expect(cache.get).toHaveBeenCalledWith(expect.any(String));
    expect(cache.set).toHaveBeenCalledWith(expect.any(String), 1, '5s');
    expect(task).toHaveBeenCalledWith(request);
  });

  test('should execute the task when the cached value is below the limit', async () => {
    const strategy = new ThrottleStrategy(cache, { ttl: '5s', limit: 5 });
    const request = {};
    const task = vitest.fn().mockResolvedValue('result');

    vitest.spyOn(cache, 'get').mockReturnValue(4);

    await strategy.execute(request, task);

    expect(cache.get).toHaveBeenCalledWith(expect.any(String));
    expect(cache.set).toHaveBeenCalledWith(expect.any(String), 5, '5s');
    expect(task).toHaveBeenCalledWith(request);
  });

  test('should throw an error when the cached value is equal to the limit', async () => {
    const strategy = new ThrottleStrategy(cache, { ttl: '5s', limit: 5 });
    const request = {};
    const task = vitest.fn().mockResolvedValue('result');

    vitest.spyOn(cache, 'get').mockReturnValue(5);

    await expect(strategy.execute(request, task)).rejects.toThrow(
      'Rate limit exceeded'
    );

    expect(cache.get).toHaveBeenCalledWith(expect.any(String));
    expect(cache.set).not.toHaveBeenCalled();
    expect(task).not.toHaveBeenCalled();
  });

  test('should handle requests concurrently without exceeding the limit', async () => {
    const strategy = new ThrottleStrategy(cache, { ttl: '5s', limit: 2 });
    const request = {};
    const task = vitest.fn().mockResolvedValue('result');

    const promises = Array.from({ length: 5 }, () =>
      strategy.execute(request, task)
    );

    await Promise.all(promises);

    expect(cache.get).toHaveBeenCalledTimes(5);
    expect(cache.set).toHaveBeenCalledTimes(5);
    expect(task).toHaveBeenCalledTimes(5);
  });
});
