import { Cache } from '../internal/cache/cache';
import { CommandBus } from './command_bus';

describe('CommandBus', () => {
  let bus: CommandBus;

  beforeEach(() => {
    bus = new CommandBus(new Cache());
  });

  it('should be able to register a command handler', () => {
    const handler = vitest.fn();

    bus.register('test', handler);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should be able to unregister a command handler', () => {
    const handler = vitest.fn();

    const unregister = bus.register('test', handler);

    unregister();

    expect(handler).not.toHaveBeenCalled();
  });

  it('should be able to dispatch a command', async () => {
    const handler = vitest.fn();

    bus.register('test', handler);

    await bus.dispatch({
      commandName: 'test',
      payload: {},
    });

    expect(handler).toHaveBeenCalled();
  });

  it('should be able to execute a command', async () => {
    const handler = vitest.fn();

    bus.register('test', async () => {
      // Do nothing
    });

    await bus.execute(
      {
        commandName: 'test',
        payload: {},
      },
      (command) => handler(command)
    );

    expect(handler).toHaveBeenCalled();
  });
});
