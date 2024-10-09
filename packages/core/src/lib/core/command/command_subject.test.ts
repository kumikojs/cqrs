import { Mock } from 'vitest';

import { Client } from '../../client';
import { Command } from '../../types/core/command';
import { CommandSubject } from './command_subject';
import { MemoryStorageDriver } from '../../infrastructure/storage/drivers/memory_storage';

describe('CommandSubject', () => {
  let client: Client;
  let command: Command;
  let handler: Mock;

  beforeEach(() => {
    client = new Client({
      resilience: {
        command: {
          timeout: 0,
          throttle: {
            interval: 0,
            rate: 1,
          },
          retry: {
            delay: 0,
            maxAttempts: 1,
          },
        },
      },
      cache: {
        l2: {
          driver: new MemoryStorageDriver(),
        },
      },
    });

    command = { commandName: 'test', payload: { id: '1' } };

    client.command.dispatch = vi.fn().mockResolvedValue(undefined);

    handler = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vitest.clearAllMocks();
  });

  it('should execute a command using the provided handler', async () => {
    const subject = new CommandSubject(client, handler);

    await subject.execute(command);

    expect(handler).toHaveBeenCalledOnce();

    expect(handler).toHaveBeenCalledWith(
      command,
      expect.objectContaining({
        cache: expect.anything(),
        emit: expect.any(Function),
      })
    );
  });

  it('should fall back to client dispatch if no handler is provided', async () => {
    const subject = new CommandSubject(client);

    await subject.execute(command);

    expect(client.command.dispatch).toHaveBeenCalledOnce();
    expect(client.command.dispatch).toHaveBeenCalledWith(command);
  });

  it('should update state to pending when a command is executing', async () => {
    const subject = new CommandSubject(client, handler);

    const stateSpy = vi.fn();
    subject.subscribe(stateSpy);

    const executePromise = subject.execute(command);

    expect(subject.state.isPending).toBe(true);
    expect(subject.state.isIdle).toBe(false);
    await executePromise;
  });

  it('should update state to fulfilled after command execution', async () => {
    const subject = new CommandSubject(client, handler);

    await subject.execute(command);

    expect(subject.state.isFulfilled).toBe(true);
    expect(subject.state.isPending).toBe(false);
    expect(subject.state.isRejected).toBe(false);
  });

  it('should handle command execution errors', async () => {
    const error = new Error('Execution failed');

    handler.mockRejectedValue(error);

    const subject = new CommandSubject(client, handler);

    const promise = subject.execute(command);

    await expect(promise).rejects.toThrow('Execution failed');

    expect(subject.state.isRejected).toBe(true);
    expect(subject.state.isFulfilled).toBe(false);
    expect(subject.state.error).toBe(error);
  });

  it('should allow subscribing to state changes', async () => {
    const subject = new CommandSubject(client, handler);
    const stateChanges = vi.fn();

    subject.subscribe(stateChanges);

    await subject.execute(command);

    expect(stateChanges).toHaveBeenCalledTimes(2); // Pending, then Fulfilled
  });

  it('should unsubscribe from state changes', async () => {
    const subject = new CommandSubject(client, handler);
    const stateChanges = vi.fn();

    const unsubscribe = subject.subscribe(stateChanges);

    await subject.execute({
      commandName: 'test',
      payload: { id: '1' },
      options: { throttle: false },
    });

    unsubscribe();

    await subject.execute(command); // Should no longer trigger stateChanges

    expect(stateChanges).toHaveBeenCalledTimes(2); // Only for the first command
  });

  it('should start with idle state', () => {
    const subject = new CommandSubject(client);

    expect(subject.state.isIdle).toBe(true);
    expect(subject.state.isPending).toBe(false);
    expect(subject.state.isFulfilled).toBe(false);
    expect(subject.state.isRejected).toBe(false);
  });
});
