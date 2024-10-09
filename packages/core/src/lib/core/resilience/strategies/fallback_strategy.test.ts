import { FallbackStrategy } from './fallback_strategy';

type Request = { key: string };

describe('FallbackStrategy', () => {
  let fallbackStrategy: FallbackStrategy;

  beforeEach(() => {
    fallbackStrategy = new FallbackStrategy({
      fallback: vitest.fn(
        (request) => `fallback for ${(request as Request).key}`
      ),
    });
  });

  test('should execute task and return result when task succeeds', async () => {
    const request = { key: 'value' };
    const task = vitest.fn().mockResolvedValue('success result');

    const result = await fallbackStrategy.execute(request, task);

    expect(task).toHaveBeenCalledTimes(1);
    expect(result).toEqual('success result');
  });

  test('should call fallback and return fallback result when task fails', async () => {
    const request = { key: 'value' };
    const errorTask = vitest.fn().mockRejectedValue(new Error('Task failed'));

    const result = await fallbackStrategy.execute(request, errorTask);

    expect(errorTask).toHaveBeenCalledTimes(1);
    expect(fallbackStrategy['options'].fallback).toHaveBeenCalledWith(
      request,
      new Error('Task failed')
    );
    expect(result).toEqual('fallback for value');
  });

  test('should handle custom fallback logic based on request and error', async () => {
    fallbackStrategy = new FallbackStrategy({
      fallback: vitest.fn(
        (request, error) =>
          `Handled ${(error as Error).message} for ${(request as Request).key}`
      ),
    });

    const request = { key: 'custom' };
    const errorTask = vitest.fn().mockRejectedValue(new Error('Custom error'));

    const result = await fallbackStrategy.execute(request, errorTask);

    expect(errorTask).toHaveBeenCalledTimes(1);
    expect(fallbackStrategy['options'].fallback).toHaveBeenCalledWith(
      request,
      new Error('Custom error')
    );
    expect(result).toEqual('Handled Custom error for custom');
  });

  test('should not call fallback if task succeeds', async () => {
    const request = { key: 'success' };
    const task = vitest.fn().mockResolvedValue('success result');

    const result = await fallbackStrategy.execute(request, task);

    expect(task).toHaveBeenCalledTimes(1);
    expect(fallbackStrategy['options'].fallback).toHaveBeenCalledTimes(0); // Fallback shouldn't be called
    expect(result).toEqual('success result');
  });
});
