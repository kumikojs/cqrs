import { EventTaskManager } from './event-task-manager';

describe('EventTaskManager', () => {
  let taskManager: EventTaskManager;

  beforeEach(() => {
    taskManager = new EventTaskManager();
  });

  describe('serialize', () => {
    it('should only serialize the event name and payload', () => {
      const event = {
        eventName: 'test',
        payload: { fake: 'test' },
        options: {
          fake: 'test',
        },
        context: {
          fake: 'test',
        },
      };

      expect(taskManager['serialize'](event)).toBe(
        JSON.stringify({
          name: event.eventName,
          payload: event.payload,
        })
      );
    });
  });
});
