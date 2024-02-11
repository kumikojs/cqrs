/* eslint-disable @typescript-eslint/no-explicit-any */
import { RetryStrategy } from './retry-strategy';

describe('RetryStrategy', () => {
  test('should retry the task until it succeeds', async () => {
    const task = vitest
      .fn()
      .mockRejectedValueOnce('error')
      .mockResolvedValueOnce('success');
    const strategy = new RetryStrategy({ maxRetries: 2, delay: 0 });

    const result = await strategy.execute('request', task);

    expect(result).toBe('success');
    expect(task).toHaveBeenCalledTimes(2);
  });

  test('should throw the last error if the task fails all retries', async () => {
    const task = vitest.fn().mockRejectedValue('error');
    const strategy = new RetryStrategy({ maxRetries: 3, delay: 0 });

    await expect(strategy.execute('request', task)).rejects.toBe('error');
    expect(task).toHaveBeenCalledTimes(3);
  });

  test('should delay for backoff', async () => {
    const task = vitest
      .fn()
      .mockRejectedValueOnce('error')
      .mockRejectedValueOnce('error')
      .mockResolvedValueOnce('success');
    const strategy = new RetryStrategy({ maxRetries: 3, delay: 100 });

    const start = Date.now();
    await strategy.execute('request', task);
    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(200);
  });
});
