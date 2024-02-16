import { QueryTaskManager } from './query-task-manager';

describe('QueryTaskManager', () => {
  let taskManager: QueryTaskManager;

  beforeEach(() => {
    taskManager = new QueryTaskManager();
  });

  describe('serialize', () => {
    it('should only serialize the query name and payload', () => {
      const query = {
        queryName: 'test',
        payload: { fake: 'test' },
        options: {
          fake: 'test',
        },
        context: {
          fake: 'test',
        },
      };

      expect(taskManager['serialize'](query)).toBe(
        JSON.stringify({
          name: query.queryName,
          payload: query.payload,
        })
      );
    });
  });
});
