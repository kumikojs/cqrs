import { RetryStrategy } from './retry_strategy'; // Update with the correct import path
import { ms } from '../../../utilities/ms/ms';

describe('RetryStrategy', () => {
  let retryStrategy: RetryStrategy;

  beforeEach(() => {
    retryStrategy = new RetryStrategy({
      maxAttempts: 3,
      delay: '100ms',
      shouldNotRetryErrors: [],
    });
  });

  test('should execute successfully without retries', async () => {
    const request = { key: 'value' };
    const successTask = vitest.fn().mockResolvedValue('success');

    const result = await retryStrategy.execute(request, successTask);

    expect(successTask).toHaveBeenCalledWith(request);
    expect(result).toEqual('success');
  });

  test('should retry on transient errors and eventually succeed', async () => {
    const request = { key: 'value' };
    const transientTask = vitest
      .fn()
      .mockRejectedValueOnce(new Error('Transient error')) // First attempt fails
      .mockResolvedValue('success'); // Second attempt succeeds

    const result = await retryStrategy.execute(request, transientTask);

    expect(transientTask).toHaveBeenCalledTimes(2); // Should retry once
    expect(result).toEqual('success');
  });

  test('should throw error after max attempts reached', async () => {
    const request = { key: 'value' };
    const failingTask = vitest
      .fn()
      .mockRejectedValue(new Error('Permanent error'));

    await expect(retryStrategy.execute(request, failingTask)).rejects.toThrow(
      'Permanent error'
    );
    expect(failingTask).toHaveBeenCalledTimes(3); // Should attempt 3 times
  });

  test('should not retry on non-retryable errors', async () => {
    class NonRetryableError extends Error {}

    retryStrategy = new RetryStrategy({
      shouldNotRetryErrors: [NonRetryableError],
    });

    const request = { key: 'value' };
    const nonRetryableTask = vitest
      .fn()
      .mockRejectedValue(new NonRetryableError('Non-retryable error'));

    await expect(
      retryStrategy.execute(request, nonRetryableTask)
    ).rejects.toThrow(NonRetryableError);
    expect(nonRetryableTask).toHaveBeenCalledTimes(1); // Should not retry
  });

  test('should respect the shouldNotRetryErrors option', async () => {
    class NonRetryableError extends Error {}
    class AnotherNonRetryableError extends Error {}

    retryStrategy = new RetryStrategy({
      shouldNotRetryErrors: [NonRetryableError, AnotherNonRetryableError],
    });

    const request = { key: 'value' };
    const errorTask = vitest
      .fn()
      .mockRejectedValue(new NonRetryableError('This error should not retry'));

    await expect(retryStrategy.execute(request, errorTask)).rejects.toThrow(
      NonRetryableError
    );
    expect(errorTask).toHaveBeenCalledTimes(1); // Should not retry
  });

  test('should apply exponential backoff delay between attempts', async () => {
    const request = { key: 'value' };
    const transientTask = vitest
      .fn()
      .mockRejectedValue(new Error('Transient error'));

    const startTime = Date.now();

    // Execute the task, which should fail and retry
    await expect(retryStrategy.execute(request, transientTask)).rejects.toThrow(
      'Transient error'
    );

    const totalDuration = Date.now() - startTime;

    // Expect the total duration to be greater than the sum of the delays for the attempts
    expect(totalDuration).toBeGreaterThanOrEqual(
      ms('100ms') + ms('200ms') + ms('300ms')
    );
  });
});
