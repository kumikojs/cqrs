import { CommandBus } from './command_bus';
import { MemoryStorageDriver } from '../../infrastructure/storage/drivers/memory_storage';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { QueryCache } from '../query/query_cache';
import { EventBus } from '../event/event_bus';

import type { EventBusContract } from '../../types/core/event';
import type { ResilienceBuilderOptions } from '../../types/core/options/resilience_options';

describe('CommandBus', () => {
  let bus: CommandBus;
  let cache: QueryCache;
  let emitter: EventBusContract;
  let logger: KumikoLogger;
  let options: ResilienceBuilderOptions;

  beforeEach(() => {
    cache = new QueryCache({
      l2: {
        driver: new MemoryStorageDriver(),
      },
    });
    logger = new KumikoLogger();
    emitter = new EventBus(logger);
    options = {};

    bus = new CommandBus(cache, emitter, logger, options);
  });

  describe('Registration and Dispatching', () => {
    it('should be able to unregister a command handler', () => {
      const handler = vi.fn();

      const unregister = bus.register('test_unsub', handler);

      unregister();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should be able to unregister a command handler by reference', async () => {
      const handler = vi.fn();

      bus.register('test', handler);

      await bus.dispatch({
        commandName: 'test',
        payload: {},
      });

      expect(handler).toHaveBeenCalled();

      bus.unregister('test', handler);

      await expect(
        bus.dispatch({
          commandName: 'test',
          payload: {},
        })
      ).rejects.toThrow();
    });

    it('should be able to register a command handler and dispatch a command', async () => {
      const handler = vi.fn();

      bus.register('test', handler);

      await bus.dispatch({
        commandName: 'test',
        payload: {},
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should throw an error if trying to register more than one handler for the same command', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.register('test', handler1);

      expect(() => {
        bus.register('test', handler2);
      }).toThrowError(
        `Limit of 1 handler(s) per channel reached. Channel: 'test' not registered.`
      );
    });
  });

  describe('Command Execution', () => {
    it('should be able to execute a command', async () => {
      const handler = vi.fn();

      bus.register('test', async () => {
        return;
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

    it('should call the interceptor manager execute method when executing a command', async () => {
      const handler = vi.fn();
      const interceptorExecuteSpy = vi.spyOn(bus.interceptors, 'execute');

      bus.register('test', async () => {
        return;
      });

      await bus.execute(
        {
          commandName: 'test',
          payload: {},
        },
        (command) => handler(command)
      );

      expect(interceptorExecuteSpy).toHaveBeenCalled();
    });
  });

  describe('Interceptors', () => {
    it('should apply interceptors when executing a command', async () => {
      const handler = vi.fn();
      const interceptorSpy = vi.spyOn(bus.interceptors, 'execute');

      bus.register('test', handler);

      await bus.execute(
        {
          commandName: 'test',
          payload: {},
        },
        (command) => handler(command)
      );

      expect(interceptorSpy).toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });

    it('should call interceptors during dispatching', async () => {
      const interceptorSpy = vi.spyOn(bus.interceptors, 'execute');

      bus.register('test', async () => {
        return;
      });

      await bus.dispatch({
        commandName: 'test',
        payload: {},
      });

      expect(interceptorSpy).toHaveBeenCalled();
    });
  });

  describe('Disconnection', () => {
    it('should disconnect and clear all handlers and interceptors', async () => {
      const handler = vi.fn();
      bus.register('test', handler);

      bus.disconnect();

      await expect(
        bus.dispatch({
          commandName: 'test',
          payload: {},
        })
      ).rejects.toThrow();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should call interceptor manager disconnect on disconnect', () => {
      const disconnectSpy = vi.spyOn(bus.interceptors, 'disconnect');
      bus.disconnect();

      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should throw error if command handler is not found during dispatch', async () => {
      await expect(
        bus.dispatch({
          commandName: 'nonexistent_command',
          payload: {},
        })
      ).rejects.toThrowError(
        `No handler found for this channel: 'nonexistent_command'`
      );
    });

    it('should handle execution errors within command handlers', async () => {
      const faultyHandler = vi
        .fn()
        .mockRejectedValue(new Error('Handler error'));
      bus.register('test_faulty', faultyHandler);

      await expect(
        bus.execute(
          {
            commandName: 'test_faulty',
            payload: {},
            options: {
              retry: false,
            },
          },
          faultyHandler
        )
      ).rejects.toThrowError('Handler error');
    });
  });
});
