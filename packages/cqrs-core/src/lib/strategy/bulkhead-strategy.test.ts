import { BulkheadException, BulkheadStrategy } from './bulkhead-strategy';

describe('BulkheadStrategy', () => {
  it('should execute a task immediately if the bulkhead is not full', async () => {
    const task = vitest.fn().mockResolvedValue('result');
    const strategy = new BulkheadStrategy({ maxConcurrent: 1, maxQueue: 1 });

    const result = await strategy.execute('request', task);

    expect(result).toBe('result');
    expect(task).toHaveBeenCalledWith('request');
  });

  it('should execute a task immediately if the bulkhead is not full and there are queued tasks', async () => {
    const task = vitest.fn().mockResolvedValue('result');
    const strategy = new BulkheadStrategy({ maxConcurrent: 1, maxQueue: 1 });

    const result = await Promise.all([
      strategy.execute('request1', task),
      strategy.execute('request2', task),
    ]);

    expect(result).toEqual(['result', 'result']);
    expect(task).toHaveBeenCalledTimes(2);
    expect(task).toHaveBeenCalledWith('request1');
    expect(task).toHaveBeenCalledWith('request2');
  });

  it('should queue a task if the bulkhead is full', async () => {
    const task = vitest.fn().mockResolvedValue('result');
    const strategy = new BulkheadStrategy({ maxConcurrent: 1, maxQueue: 10 });

    const result = await Promise.all([
      strategy.execute('request1', task),
      strategy.execute('request2', task),
      strategy.execute('request3', task),
    ]);

    expect(result).toEqual(['result', 'result', 'result']);
    expect(task).toHaveBeenCalledTimes(3);
    expect(task).toHaveBeenCalledWith('request1');
    expect(task).toHaveBeenCalledWith('request2');
    expect(task).toHaveBeenCalledWith('request3');
  });

  it('should throw an error if the bulkhead is full and there are no queue slots', async () => {
    const task = vitest.fn().mockResolvedValue('result');
    const strategy = new BulkheadStrategy({ maxConcurrent: 1, maxQueue: 0 });

    strategy.execute('request', task);
    const result = strategy.execute('request', task);

    await expect(result).rejects.toThrowError(new BulkheadException(1, 0));
  });

  it('should throw an error if the task throws an error', async () => {
    const task = vitest.fn().mockRejectedValue(new Error('Task failed'));
    const strategy = new BulkheadStrategy({ maxConcurrent: 1, maxQueue: 1 });

    const result = strategy.execute('request', task);

    await expect(result).rejects.toThrow('Task failed');
  });

  it('should throw an error if the task throws an error and the bulkhead is full', async () => {
    const task = vitest.fn().mockRejectedValue(new Error('Task failed'));
    const strategy = new BulkheadStrategy({ maxConcurrent: 1, maxQueue: 1 });

    const result = Promise.all([
      strategy.execute('request1', task),
      strategy.execute('request2', task),
      strategy.execute('request3', task),
    ]);

    await expect(result).rejects.toThrowError(new BulkheadException(1, 1));
  });
});
