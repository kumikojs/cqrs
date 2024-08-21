/* eslint-disable @typescript-eslint/no-explicit-any */

import { DeduplicationStrategy } from './deduplication_strategy';

describe('DeduplicationStrategy', () => {
  it('should deduplicate tasks', async () => {
    const serialize = vitest.fn((request: any) => JSON.stringify(request));
    const task = vitest.fn((request: any) => Promise.resolve(request));
    const task2 = vitest.fn((request: any) => Promise.resolve(request));
    const task3 = vitest.fn((request: any) => Promise.resolve(request));
    const strategy = new DeduplicationStrategy({ serialize });

    Promise.all([
      strategy.execute({ id: 1 }, task),
      strategy.execute({ id: 1 }, task),
      strategy.execute({ id: 1 }, task),
      strategy.execute({ id: 2 }, task2),
      strategy.execute({ id: 2 }, task2),
      strategy.execute({ id: 3 }, task3),
    ]);

    expect(task).toHaveBeenCalledOnce();
    expect(task2).toHaveBeenCalledOnce();
    expect(task3).toHaveBeenCalledOnce();
    expect(serialize).toHaveBeenCalledTimes(6);
  });
});
