import { CommandSubject } from './command_subject';

describe('CommandSubject', () => {
  it('should execute a command', async () => {
    const command = {
      name: 'test',
      payload: { id: '1' },
    };

    const handler = vitest.fn().mockResolvedValue(undefined);

    const subject = new CommandSubject();

    await subject.execute(command, handler);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should subscribe to command state changes', async () => {
    const command = {
      name: 'test',
      payload: { id: '1' },
    };
    const fulfilledHandler = vitest.fn();
    const handler = vitest.fn().mockResolvedValue(undefined);

    const subject = new CommandSubject();

    const unsubscribe = subject.subscribe(() => {
      if (subject.state.isFulfilled) {
        fulfilledHandler();
        unsubscribe();
      }
    });

    await subject.execute(command, handler);

    expect(fulfilledHandler).toHaveBeenCalledOnce();
  });

  it('should get the current state of the command', async () => {
    const command = {
      name: 'test',
      payload: { id: '1' },
    };

    const handler = vitest.fn().mockResolvedValue(undefined);

    const subject = new CommandSubject();

    expect(subject.state.isIdle).toBeTruthy();

    await subject.execute(command, handler);

    expect(subject.state.isFulfilled).toBeTruthy();
  });
});
