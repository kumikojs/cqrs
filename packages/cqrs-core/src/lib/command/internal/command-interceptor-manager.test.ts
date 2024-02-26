import type { CommandContract } from '../command';

import { CommandInterceptorManager } from './command-interceptor-manager';

describe('CommandInterceptorManager', () => {
  let interceptorManager: CommandInterceptorManager;

  beforeEach(() => {
    interceptorManager = new CommandInterceptorManager();
  });

  test('should apply an interceptor globally', async () => {
    const interceptor = vitest.fn();
    const command = { commandName: 'testCommand' } as CommandContract;
    const command2 = { commandName: 'testCommand2' } as CommandContract;

    interceptorManager.apply(interceptor);

    await interceptorManager.execute(command, async () => 'test');
    await interceptorManager.execute(command2, async () => 'test');

    expect(interceptor).toHaveBeenCalledWith(command, expect.any(Function));
    expect(interceptor).toHaveBeenCalledWith(command2, expect.any(Function));
  });

  test('should apply an interceptor to a specific command', async () => {
    const interceptor = vitest.fn();
    const command = { commandName: 'testCommand' } as CommandContract;
    const command2 = { commandName: 'testCommand2' } as CommandContract;

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
    const command = { commandName: 'testCommand' } as CommandContract;
    const command2 = { commandName: 'testCommand2' } as CommandContract;
    const command3 = { commandName: 'testCommand3' } as CommandContract;

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
    const command = {
      commandName: 'testCommand',
      options: { notifiable: true },
    } as CommandContract;
    const command2 = {
      commandName: 'testCommand2',
      options: { notifiable: false },
    } as CommandContract;

    interceptorManager
      .select((command) => Boolean(command.options?.['notifiable']))
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
