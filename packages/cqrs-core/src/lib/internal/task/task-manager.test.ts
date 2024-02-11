/* eslint-disable @typescript-eslint/no-explicit-any */

import { TaskManager, TaskManagerContract } from './task-manager';

describe('TaskManager', () => {
  let taskManager: TaskManagerContract<any, any>;

  beforeEach(() => {
    taskManager = new (class extends TaskManager<any, any> {
      protected serialize(request: any) {
        return JSON.stringify(request);
      }
    })();
  });

  describe('execute', () => {
    it('should execute the task', async () => {
      const request = {};
      const task = vitest.fn().mockResolvedValue('result');

      const result = await taskManager.execute(request, task);

      expect(result).toBe('result');
      expect(task).toHaveBeenCalledWith(request);
    });

    it('should execute the task only once for the same request', async () => {
      const request = { fake: 'test' };
      const task = vitest.fn().mockResolvedValue('result');

      await Promise.all([
        taskManager.execute(request, task),
        taskManager.execute(request, task),
        taskManager.execute(request, task),
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

    it('should execute the task for the same request after the previous execution is finished', async () => {
      const request = { fake: 'test' };
      const task = vitest.fn().mockResolvedValue('result');

      await Promise.all([
        taskManager.execute(request, task),
        taskManager.execute(request, task),
      ]);

      expect(task).toHaveBeenCalledTimes(1);
    });

    it('should execute the task for the same request after the previous execution is rejected', async () => {
      const request = {};
      const task = vitest.fn().mockRejectedValue(new Error('error'));

      await taskManager.execute(request, task).catch(() => {
        //noop
      });
      await taskManager.execute(request, task).catch(() => {
        //noop
      });

      expect(task).toHaveBeenCalledTimes(2);
    });
  });
});
