import { DeduplicationStrategy } from './deduplication_strategy';

describe('DeduplicationStrategy', () => {
  let deduplicationStrategy: DeduplicationStrategy;

  beforeEach(() => {
    deduplicationStrategy = new DeduplicationStrategy({
      serialize: (request) => JSON.stringify(request),
    });
  });

  test('should execute task if no pending task exists', async () => {
    const request = { key: 'value' };
    const task = vitest.fn().mockResolvedValue('result');

    const result = await deduplicationStrategy.execute(request, task);

    expect(task).toHaveBeenCalledTimes(1);
    expect(result).toEqual('result');
  });

  test('should return the result of the pending task if it exists', async () => {
    const request = { key: 'value' };
    const task = vitest.fn().mockResolvedValue('result');

    // Call once to start a pending task
    deduplicationStrategy.execute(request, task);

    // Call again before the first task resolves
    const result = await deduplicationStrategy.execute(request, task);

    expect(task).toHaveBeenCalledTimes(1); // Task should only execute once
    expect(result).toEqual('result');
  });

  test('should remove pending task after execution completes', async () => {
    const request = { key: 'value' };
    const task = vitest.fn().mockResolvedValue('result');

    await deduplicationStrategy.execute(request, task);

    // Call again after the task has resolved
    const result = await deduplicationStrategy.execute(request, task);

    expect(task).toHaveBeenCalledTimes(2); // Task should execute again
    expect(result).toEqual('result');
  });

  test('should remove pending task even if task fails', async () => {
    const request = { key: 'value' };
    const task = vitest.fn().mockRejectedValue('task error');

    await expect(deduplicationStrategy.execute(request, task)).rejects.toEqual(
      'task error'
    );

    // Call again after the task has failed
    const task2 = vitest.fn().mockResolvedValue('success result');
    const result = await deduplicationStrategy.execute(request, task2);

    expect(task2).toHaveBeenCalledTimes(1);
    expect(result).toEqual('success result');
  });
});
