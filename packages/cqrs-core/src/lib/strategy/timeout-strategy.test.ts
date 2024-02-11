import { TimeoutStrategy } from './timeout-strategy';

describe('TimeoutStrategy', () => {
  test('should reject the task after the timeout', async () => {
    const task = async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    };

    const strategy = new TimeoutStrategy({ timeout: 50 });

    await expect(strategy.execute({}, task)).rejects.toThrow(
      'Task timed out after 50ms'
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
      await new Promise((_, reject) => setTimeout(reject, 150));
    };

    const strategy = new TimeoutStrategy({ timeout: 100 });

    await expect(strategy.execute({}, task)).rejects.toThrow(
      'Task timed out after 100ms'
    );
  });
});
