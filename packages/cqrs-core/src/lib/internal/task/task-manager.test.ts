/* eslint-disable @typescript-eslint/no-explicit-any */

import { TaskManager, TaskManagerContract } from './task-manager';

describe('TaskManager', () => {
  let taskManager: TaskManagerContract<any, any>;

  beforeEach(() => {
    taskManager = new TaskManager();
  });

  describe('execute', () => {
    it('should execute the task', async () => {
      const context = {};
      const task = vitest.fn().mockResolvedValue('result');

      const result = await taskManager.execute(context, task);

      expect(result).toBe('result');
      expect(task).toHaveBeenCalledWith(context);
    });

    it('should execute the task only once for the same context', async () => {
      const context = { fake: 'test' };
      const task = vitest.fn().mockResolvedValue('result');

      await Promise.all([
        taskManager.execute(context, task),
        taskManager.execute(context, task),
        taskManager.execute(context, task),
      ]);

      expect(task).toHaveBeenCalledTimes(1);
    });

    it('should execute the task for different contexts', async () => {
      const task = vitest.fn().mockResolvedValue('result');

      await Promise.all([
        taskManager.execute({ fake: 'test' }, task),
        taskManager.execute({ fake: 'test1' }, task),
        taskManager.execute({ fake: 'test2' }, task),
      ]);

      expect(task).toHaveBeenCalledTimes(3);
    });

    it('should execute the task for the same context after the previous execution is finished', async () => {
      const context = { fake: 'test' };
      const task = vitest.fn().mockResolvedValue('result');

      await Promise.all([
        taskManager.execute(context, task),
        taskManager.execute(context, task),
      ]);

      expect(task).toHaveBeenCalledTimes(1);
    });

    it('should execute the task for the same context after the previous execution is rejected', async () => {
      const context = {};
      const task = vitest.fn().mockRejectedValue(new Error('error'));

      await taskManager.execute(context, task).catch(() => {
        //noop
      });
      await taskManager.execute(context, task).catch(() => {
        //noop
      });

      expect(task).toHaveBeenCalledTimes(2);
    });
  });
});
