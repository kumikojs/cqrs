/* eslint-disable @typescript-eslint/no-explicit-any */
import { RetryStrategy } from './retry_strategy';

describe('RetryStrategy', () => {
  test('should retry the task until it succeeds', async () => {
    const task = vitest
      .fn()
      .mockRejectedValueOnce('error')
      .mockRejectedValueOnce('error') // 1st retry
      .mockResolvedValueOnce('success'); // 2nd retry
    const strategy = new RetryStrategy({ maxAttempts: 2, delay: 0 });

    const result = await strategy.execute('request', task);

    expect(result).toBe('success');
    expect(task).toHaveBeenCalledTimes(3);
  });

  test('should throw the last error if the task fails all retries', async () => {
    const task = vitest.fn().mockRejectedValue('error');
    const strategy = new RetryStrategy({ maxAttempts: 3, delay: 0 });

    await expect(strategy.execute('request', task)).rejects.toBe('error');
    expect(task).toHaveBeenCalledTimes(4);
  });

  test('should delay for backoff', async () => {
    const task = vitest
      .fn()
      .mockRejectedValueOnce('error')
      .mockRejectedValueOnce('error')
      .mockResolvedValueOnce('success');
    const strategy = new RetryStrategy({ maxAttempts: 3, delay: 100 });

    const start = Date.now();
    await strategy.execute('request', task);
    const end = Date.now();

    expect(end - start).toBeGreaterThanOrEqual(200);
  });

  test('should throw the error directly if it is in the throwErrors list', async () => {
    class CustomError extends Error {
      public constructor(message: string) {
        super(message);
      }
    }

    class ValidationError extends CustomError {
      public constructor(message: string, public code: number) {
        super(message);
      }
    }

    const task = vitest
      .fn()
      .mockRejectedValue(new ValidationError('error', 400));

    const strategy = new RetryStrategy({
      maxAttempts: 3,
      delay: 0,
      shouldNotRetryErrors: [ValidationError, CustomError],
    });

    await expect(strategy.execute('request', task)).rejects.toStrictEqual(
      new ValidationError('error', 400)
    );

    expect(task).toHaveBeenCalledTimes(1);
  });
});
