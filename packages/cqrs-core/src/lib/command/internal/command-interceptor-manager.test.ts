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

  test('should apply an interceptor globally', async () => {
    const interceptor = vitest.fn();
    const command = new TestCommand('testCommand');
    const command2 = new TestCommand('testCommand2');

    interceptorManager.apply(interceptor);

    await interceptorManager.execute(command, async () => 'test');
    await interceptorManager.execute(command2, async () => 'test');

    expect(interceptor).toHaveBeenCalledWith(command, expect.any(Function));
    expect(interceptor).toHaveBeenCalledWith(command2, expect.any(Function));
  });

  test('should apply an interceptor to a specific command', async () => {
    const interceptor = vitest.fn();
    const command = new TestCommand('testCommand');
    const command2 = new TestCommand('testCommand2');

    interceptorManager
      .select((command) => command.commandName === 'testCommand')
      .apply(interceptor);

    await interceptorManager.execute(command, async () => 'test');
    await interceptorManager.execute(command2, async () => 'test');

    expect(interceptor).toHaveBeenCalledWith(command, expect.any(Function));
    expect(interceptor).not.toHaveBeenCalledWith(
      command2,
      expect.any(Function)
    );
  });

  test('should apply an interceptor to a list of commands', async () => {
    const interceptor = vitest.fn();
    const command = new TestCommand('testCommand');
    const command2 = new TestCommand('testCommand2');
    const command3 = new TestCommand('testCommand3');

    interceptorManager
      .select((command) =>
        ['testCommand', 'testCommand2'].includes(command.commandName)
      )
      .apply(interceptor);

    await interceptorManager.execute(command, async () => 'test');
    await interceptorManager.execute(command2, async () => 'test');
    await interceptorManager.execute(command3, async () => 'test');

    expect(interceptor).toHaveBeenCalledWith(command, expect.any(Function));
    expect(interceptor).toHaveBeenCalledWith(command2, expect.any(Function));
    expect(interceptor).not.toHaveBeenCalledWith(
      command3,
      expect.any(Function)
    );
  });

  test('should apply an interceptor to a specific command based on options', async () => {
    const interceptor = vitest.fn();
    const command = new TestCommand('testCommand', { notifiable: true });
    const command2 = new TestCommand('testCommand2', { notifiable: false });

    interceptorManager
      .select<{
        commandName: string;
        options: { notifiable: boolean };
      }>((command) => command.options.notifiable)
      .apply(interceptor);

    await interceptorManager.execute(command, async () => 'test');
    await interceptorManager.execute(command2, async () => 'test');

    expect(interceptor).toHaveBeenCalledWith(command, expect.any(Function));
    expect(interceptor).not.toHaveBeenCalledWith(
      command2,
      expect.any(Function)
    );
  });
});
