import type { CommandContract } from '../command';

import { CommandInterceptorManager } from './command-interceptor-manager';

class TestCommand implements CommandContract {
  constructor(
    public commandName: string,
    public options: Record<string, unknown> = {}
  ) {}
}

describe('CommandInterceptorManager', () => {
  let interceptorManager: CommandInterceptorManager;

  beforeEach(() => {
    interceptorManager = new CommandInterceptorManager();
  });

  describe('apply', () => {
    test('should apply an interceptor to all command names', async () => {
      const interceptor = vitest.fn();
      const command = new TestCommand('testCommand');
      const command2 = new TestCommand('testCommand2');

      interceptorManager.apply(interceptor).toAll();

      await interceptorManager.execute(command, async () => 'test');
      await interceptorManager.execute(command2, async () => 'test');

      expect(interceptor).toHaveBeenCalledWith(command, expect.any(Function));
      expect(interceptor).toHaveBeenCalledWith(command2, expect.any(Function));
    });

    test('should apply an interceptor to specific command names', async () => {
      const interceptor = vitest.fn();
      const command = new TestCommand('testCommand');
      const command2 = new TestCommand('testCommand2');

      interceptorManager.apply(interceptor).to('testCommand');

      await interceptorManager.execute(command, async () => 'test');
      await interceptorManager.execute(command2, async () => 'test');

      expect(interceptor).toHaveBeenCalledWith(command, expect.any(Function));
      expect(interceptor).not.toHaveBeenCalledWith(
        command2,
        expect.any(Function)
      );
    });

    test('should apply an interceptor when command options match', async () => {
      const interceptor = vitest.fn();
      const command = new TestCommand('testCommand', { notifiable: true });
      const command2 = new TestCommand('testCommand', { test: 'test2' });

      interceptorManager.apply(interceptor).when({ notifiable: true });

      await interceptorManager.execute(command, async () => 'test');
      await interceptorManager.execute(command2, async () => 'test');

      expect(interceptor).toHaveBeenCalledWith(command, expect.any(Function));
      expect(interceptor).not.toHaveBeenCalledWith(
        command2,
        expect.any(Function)
      );
    });
  });
});
