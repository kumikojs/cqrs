import { ThrottleStrategy } from './throttle_strategy';
import { Cache } from '../../../infrastructure/cache/cache';
import { KumikoLogger } from '../../../utilities/logger/kumiko_logger';
import { ThrottleException } from './exceptions/throttle_exception';

describe('ThrottleStrategy', () => {
  let cache: Cache;
  let logger: KumikoLogger;
  let throttleStrategy: ThrottleStrategy;

  beforeEach(() => {
    cache = {
      get: vi.fn(),
      set: vi.fn(),
    } as unknown as Cache;

    logger = {
      child: vi.fn().mockReturnValue(logger),
      error: vi.fn(),
    } as unknown as KumikoLogger;

    throttleStrategy = new ThrottleStrategy(cache, logger);
  });

  it('should execute the task if not throttled', async () => {
    const request = { key: 'test' };
    const task = vi.fn().mockResolvedValue('result');

    cache.get = vi.fn().mockResolvedValue(null); // No previous calls
    const result = await throttleStrategy.execute(request, task);

    expect(result).toBe('result');
    expect(task).toHaveBeenCalledWith(request);
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining('ns_throttle:{"key":"test"}'),
      1,
      throttleStrategy['options'].interval
    );
  });

  it('should throw ThrottleException if rate limit is exceeded', async () => {
    const request = { key: 'test' };
    const task = vi.fn();

    cache.get = vi.fn().mockResolvedValue(5); // Simulate that the rate has been reached

    await expect(throttleStrategy.execute(request, task)).rejects.toThrow(
      ThrottleException
    );
    await expect(throttleStrategy.execute(request, task)).rejects.toThrow(
      `Throttle limit of ${throttleStrategy['options'].rate} reached for interval ${throttleStrategy['options'].interval}`
    );
  });

  it('should increment the throttle count and execute the task if under limit', async () => {
    const request = { key: 'test' };
    const task = vi.fn().mockResolvedValue('result');

    cache.get = vi.fn().mockResolvedValue(2); // Simulate previous count
    const result = await throttleStrategy.execute(request, task);

    expect(result).toBe('result');
    expect(task).toHaveBeenCalledWith(request);
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringContaining('ns_throttle:{"key":"test"}'),
      3, // Incremented count
      throttleStrategy['options'].interval
    );
  });

  it('should default rate to 5 if set to less than 1', () => {
    const lowRateThrottleStrategy = new ThrottleStrategy(cache, logger, {
      rate: 0,
    });
    expect(lowRateThrottleStrategy['options'].rate).toBe(5); // Should default to 5
  });
});
