import { TimeoutException, TimeoutStrategy } from './timeout_strategy';

describe('TimeoutStrategy', () => {
  test('should reject the task after the timeout', async () => {
    const task = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    };

    const strategy = new TimeoutStrategy({ timeout: 50 });

    await expect(strategy.execute({}, task)).rejects.toThrowError(
      TimeoutException
    );
  });

  test('should resolve the task before the timeout', async () => {
    const task = async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    };

    const strategy = new TimeoutStrategy({ timeout: 100 });

    await expect(strategy.execute({}, task)).resolves.toBeUndefined();
  });

  test('should reject the task if it fails before the timeout', async () => {
    const task = async () => {
      throw new Error('Task failed');
    };

    const strategy = new TimeoutStrategy({ timeout: 100 });

    await expect(strategy.execute({}, task)).rejects.toThrowError(
      new Error('Task failed')
    );
  });

  test("should not execute the task if it's already timed out", async () => {
    const handle = vitest.fn();
    const task = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      handle();
    };

    const strategy = new TimeoutStrategy({ timeout: 50 });

    await expect(strategy.execute({}, task)).rejects.toThrowError(
      TimeoutException
    );

    expect(handle).not.toHaveBeenCalled();
  });
});
