import type { CacheDriver } from '../../internal/cache/cache_driver';
import { Cache } from '../../internal/cache/cache_manager';
import { ThrottleException, ThrottleStrategy } from './throttle_strategy';

describe('ThrottleStrategy', () => {
  let cache: CacheDriver<string>;

  beforeEach(() => {
    cache = new Cache().inMemoryCache;
    vitest.spyOn(cache, 'get');
    vitest.spyOn(cache, 'set');
  });

  afterEach(() => {
    vitest.clearAllMocks();
  });

  test('should execute the task when there is no cached value', async () => {
    const strategy = new ThrottleStrategy(cache, { interval: '5s', rate: 5 });
    const request = {
      name: 'test',
      payload: { id: '1' },
    };
    const task = vitest.fn().mockResolvedValue('result');

    await strategy.execute(request, task);

    expect(cache.get).toHaveBeenCalledWith(
      ThrottleStrategy.namespace,
      expect.any(String)
    );
    expect(cache.set).toHaveBeenCalledWith(
      ThrottleStrategy.namespace,
      expect.any(String),
      1,
      '5s'
    );
    expect(task).toHaveBeenCalledWith(request);
  });

  test('should execute the task when the cached value is below the rate', async () => {
    const strategy = new ThrottleStrategy(cache, { interval: '5s', rate: 5 });
    const request = {
      name: 'test',
      payload: { id: '1' },
    };
    const task = vitest.fn().mockResolvedValue('result');

    vitest.spyOn(cache, 'get').mockReturnValue(4);

    await strategy.execute(request, task);

    expect(cache.get).toHaveBeenCalledWith(
      ThrottleStrategy.namespace,
      expect.any(String)
    );
    expect(cache.set).toHaveBeenCalledWith(
      ThrottleStrategy.namespace,
      expect.any(String),
      5,
      '5s'
    );
    expect(task).toHaveBeenCalledWith(request);
  });

  test('should throw an error when the cached value is equal to the rate', async () => {
    const strategy = new ThrottleStrategy(cache, { interval: '5s', rate: 5 });
    const request = {
      name: 'test',
      payload: { id: '1' },
    };
    const task = vitest.fn().mockResolvedValue('result');

    vitest.spyOn(cache, 'get').mockReturnValue(5);

    await expect(strategy.execute(request, task)).rejects.toThrowError(
      ThrottleException
    );

    expect(cache.get).toHaveBeenCalledWith(
      ThrottleStrategy.namespace,
      expect.any(String)
    );
    expect(cache.set).not.toHaveBeenCalled();
    expect(task).not.toHaveBeenCalled();
  });

  test('should handle requests concurrently without exceeding the rate', async () => {
    const strategy = new ThrottleStrategy(cache, { interval: '5s', rate: 5 });
    const request = {
      name: 'test',
      payload: { id: '1' },
    };
    const task = vitest.fn().mockResolvedValue('result');

    const promises = Array.from({ length: 5 }, () =>
      strategy.execute(request, task)
    );

    const result = await Promise.all(promises);

    expect(cache.get).toHaveBeenCalledTimes(5);
    expect(cache.set).toHaveBeenCalledTimes(5);
    expect(task).toHaveBeenCalledTimes(5);
    expect(result).toEqual(['result', 'result', 'result', 'result', 'result']);
  });
});
