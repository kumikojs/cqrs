import { CacheStrategy } from './cache-strategy';

describe('CacheStrategy', () => {
  let cacheStrategy: CacheStrategy;

  beforeEach(() => {
    cacheStrategy = new CacheStrategy();
    vitest.useFakeTimers();
  });

  test('should cache and retrieve values correctly', async () => {
    const request = { key: 'value' };
    const task = vitest.fn().mockResolvedValue('result');

    // Execute the task for the first time, should call the task function
    let result = await cacheStrategy.execute(request, task);
    expect(task).toHaveBeenCalledTimes(1); // It's the first time task is called
    expect(result).toEqual('result');

    // Execute the task again with the same request, should retrieve the cached value
    result = await cacheStrategy.execute(request, task);
    expect(task).toHaveBeenCalledTimes(1); // Task should not be called again
    expect(result).toEqual('result'); // Result should be the cached value
  });

  test('should use custom TTL when provided', async () => {
    cacheStrategy = new CacheStrategy({ ttl: 1000 });
    const request = { key: 'value' };
    const task = vitest.fn().mockResolvedValue('result');

    // Execute the task for the first time, should call the task function
    let result = await cacheStrategy.execute(request, task);
    expect(result).toEqual('result');

    // Execute the task again with the same request, should retrieve the cached value
    result = await cacheStrategy.execute(request, task);
    expect(result).toEqual('result'); // Result should be the cached value

    // Advance the time by 2 seconds
    vitest.advanceTimersByTime(2000);

    // Execute the task again with the same request, should call the task function again
    result = await cacheStrategy.execute(request, task);
    expect(task).toHaveBeenCalledTimes(2); // Task should be called again
    expect(result).toEqual('result'); // Result should be the new value
  });

  afterEach(() => {
    vitest.clearAllTimers();
  });
});
