import { ThrottleStrategy } from './throttle_strategy';
import { Cache } from '../../../infrastructure/cache/cache';
import { KumikoLogger } from '../../../utilities/logger/kumiko_logger';
import { ThrottleException } from './exceptions/throttle_exception';
import { MemoryStorageDriver } from '../../../infrastructure/storage/drivers/memory_storage';

describe('ThrottleStrategy with real cache and fake timers', () => {
  let cache: Cache;
  let logger: KumikoLogger;
  let throttleStrategy: ThrottleStrategy;

  const mockTask = async (request: unknown) => `result: ${request}`;

  beforeEach(() => {
    cache = new Cache({
      layer: 'l1',
      storage: new MemoryStorageDriver(),
      gcInterval: 1000,
      validityPeriod: 5000,
    });
    logger = new KumikoLogger();

    throttleStrategy = new ThrottleStrategy(cache, logger, {
      rate: 2,
      interval: '10s',
    });

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests under the rate limit', async () => {
    const request = { userId: 'user1' };

    const result = await throttleStrategy.execute(request, mockTask);
    expect(result).toBe('result: [object Object]');

    const secondResult = await throttleStrategy.execute(request, mockTask);
    expect(secondResult).toBe('result: [object Object]');
  });

  it('should block requests exceeding the rate limit', async () => {
    const request = { userId: 'user2' };

    await throttleStrategy.execute(request, mockTask);
    await throttleStrategy.execute(request, mockTask);

    // Now, with rate limit exceeded, this should throw
    await expect(throttleStrategy.execute(request, mockTask)).rejects.toThrow(
      ThrottleException
    );
  });

  it('should reset the rate limit after the interval', async () => {
    const request = { userId: 'user3' };

    await throttleStrategy.execute(request, mockTask); // 1st request
    await throttleStrategy.execute(request, mockTask); // 2nd request

    // Now advance the time by 11 seconds using fake timers (no real wait needed)
    vi.advanceTimersByTime(11000);

    // The rate limit should have reset after 10 seconds
    const result = await throttleStrategy.execute(request, mockTask);
    expect(result).toBe('result: [object Object]');
  });

  it('should handle multiple unique requests separately', async () => {
    const request1 = { userId: 'user4' };
    const request2 = { userId: 'user5' };

    const result1 = await throttleStrategy.execute(request1, mockTask);
    expect(result1).toBe('result: [object Object]');

    const result2 = await throttleStrategy.execute(request2, mockTask);
    expect(result2).toBe('result: [object Object]');

    // Both users should have their separate rate limits
    await throttleStrategy.execute(request1, mockTask); // No throttle for user4 yet
    await throttleStrategy.execute(request2, mockTask); // No throttle for user5 yet
  });

  it('should properly handle rate limit reset after time elapses', async () => {
    const request = { userId: 'user6' };

    // First two requests should be allowed
    await throttleStrategy.execute(request, mockTask);
    await throttleStrategy.execute(request, mockTask);

    // At this point, the rate limit is hit
    await expect(() =>
      throttleStrategy.execute(request, mockTask)
    ).rejects.toThrow(ThrottleException);

    // Advance time by 10 seconds (the interval time) to reset the rate limit
    vi.advanceTimersByTime(10001);

    // After the time passes, the rate limit should be reset
    const result = await throttleStrategy.execute(request, mockTask);
    expect(result).toBe('result: [object Object]');
  });
});
