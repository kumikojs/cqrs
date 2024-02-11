import { CommandTaskManager } from './command-task-manager';

describe('CommandTaskManager', () => {
  let taskManager: CommandTaskManager;

  beforeEach(() => {
    taskManager = new CommandTaskManager();
  });

  describe('serialize', () => {
    it('should only serialize the command name and payload', () => {
      const command = {
        commandName: 'test',
        payload: { fake: 'test' },
        options: {
          fake: 'test',
        },
        context: {
          fake: 'test',
        },
      };

      expect(taskManager['serialize'](command)).toBe(
        JSON.stringify({
          name: command.commandName,
          payload: command.payload,
        })
      );
    });
  });
});
