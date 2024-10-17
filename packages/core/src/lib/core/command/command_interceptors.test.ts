/* eslint-disable @typescript-eslint/no-explicit-any */

import { NoHandlerFoundException } from '../../infrastructure/bus/bus_exception';
import { MemoryStorageDriver } from '../../infrastructure/storage/drivers/memory_storage';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { QueryCache } from '../query/query_cache';
import { ThrottleException } from '../resilience/strategies/exceptions/throttle_exception';
import { TimeoutException } from '../resilience/strategies/exceptions/timeout_exception';
import { CommandInterceptors } from './command_interceptors';

describe('CommandInterceptors', () => {
  let commandInterceptors: CommandInterceptors<any, any>;
  let cache: QueryCache;
  let logger: KumikoLogger;

  beforeEach(() => {
    cache = new QueryCache({
      l2: { driver: new MemoryStorageDriver() },
    });
    logger = new KumikoLogger();
    commandInterceptors = new CommandInterceptors(cache, logger, {
      timeout: 1000,
      retry: { maxAttempts: 3, delay: 100 },
      throttle: { rate: 5, interval: '1s' },
    });
  });

  it('should build interceptors with retry, timeout, throttle, and fallback', () => {
    const interceptors = commandInterceptors.buildInterceptors();
    expect(interceptors).toBeDefined();
  });

  describe('Deduplication Interceptor', () => {
    it('should deduplicate commands', async () => {
      const command = {
        commandName: 'TestCommand',
        payload: { id: 1 },
      };
      const handler = vitest.fn().mockResolvedValue('Success');

      const interceptors = commandInterceptors.buildInterceptors();

      await Promise.all([
        interceptors.execute(command, handler),
        interceptors.execute(command, handler),
        interceptors.execute(command, handler),
      ]);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback Interceptor', () => {
    it('should call the fallback handler if the command handler throws an error', async () => {
      const command = {
        commandName: 'TestCommand',
        payload: { id: 1 },
        options: { fallback: () => 'FallbackHandler' },
      };
      const handler = vitest.fn().mockRejectedValue(new Error('Failed'));

      const interceptors = commandInterceptors.buildInterceptors();
      await expect(interceptors.execute(command, handler)).resolves.toBe(
        'FallbackHandler'
      );
      expect(handler).toHaveBeenCalled();
    });

    it('should call the fallback handler if the command handler throws a NoHandlerFoundException and the defaultHandler is not provided', async () => {
      const command = {
        commandName: 'TestCommand',
        payload: { id: 1 },
        options: { fallback: () => 'FallbackHandler' },
      };
      const handler = vitest
        .fn()
        .mockRejectedValue(new NoHandlerFoundException('channel'));

      const interceptors = commandInterceptors.buildInterceptors();
      await expect(interceptors.execute(command, handler)).resolves.toBe(
        'FallbackHandler'
      );
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Retry Interceptor', () => {
    it('should retry a failed command until it succeeds', async () => {
      const command = {
        commandName: 'TestCommand',
        payload: { id: 1 },
        options: { retry: { maxAttempts: 2, delay: 100 } },
      };
      const handler = vitest
        .fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce('Success');

      const interceptors = commandInterceptors.buildInterceptors();
      await expect(interceptors.execute(command, handler)).resolves.toBe(
        'Success'
      );
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should throw an error after all retry attempts fail', async () => {
      const command = {
        commandName: 'TestCommand',
        payload: { id: 1 },
        options: { retry: { maxAttempts: 2, delay: 100 } },
      };
      const handler = vitest.fn().mockRejectedValue(new Error('Failed'));

      const interceptors = commandInterceptors.buildInterceptors();
      await expect(interceptors.execute(command, handler)).rejects.toThrow(
        'Failed'
      );
      expect(handler).toHaveBeenCalledTimes(3); // initial call + 2 retries
    });
  });

  describe('Timeout Interceptor', () => {
    it('should throw a TimeoutException if the command takes too long', async () => {
      const command = {
        commandName: 'TestCommand',
        payload: { id: 1 },
        options: { timeout: 50 },
      };
      const handler = async () =>
        new Promise((resolve) => setTimeout(resolve, 100));

      const interceptors = commandInterceptors.buildInterceptors();
      await expect(interceptors.execute(command, handler)).rejects.toThrow(
        TimeoutException
      );
    });
  });

  describe('Throttle Interceptor', () => {
    it('should throttle command execution', async () => {
      const command = {
        commandName: 'TestCommand',
        payload: { id: 1 },
        options: { throttle: { rate: 1, interval: '1s' } },
      };
      const handler = vitest.fn();

      const interceptors = commandInterceptors.buildInterceptors();
      await interceptors.execute(command, handler);
      await expect(interceptors.execute(command, handler)).rejects.toThrow(
        ThrottleException
      );
      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('Invalidating Queries Interceptor', () => {
    it('should invalidate queries after a command is executed', async () => {
      const command = {
        commandName: 'TestCommand',
        payload: { id: 1 },
        options: { invalidation: { queries: ['Query1', 'Query2'] } },
      };
      const handler = vitest.fn().mockResolvedValue('Success');
      const cacheSpy = vitest.spyOn(cache, 'invalidateQueries');

      const interceptors = commandInterceptors.buildInterceptors();
      await interceptors.execute(command, handler);

      expect(cacheSpy).toHaveBeenCalledWith('Query1', 'Query2');
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('onMutate Interceptor', () => {
    it('should call the onMutate option if provided', async () => {
      const onMutate = vitest.fn();
      const command = {
        commandName: 'TestCommand',
        payload: { id: 1 },
        options: { onMutate },
      };
      const handler = vitest.fn().mockResolvedValue('Success');

      const interceptors = commandInterceptors.buildInterceptors();
      await interceptors.execute(command, handler);

      expect(onMutate).toHaveBeenCalled();
    });
  });

  describe('Default Handler Interceptor', () => {
    it('should call defaultHandler when NoHandlerFoundException is thrown', async () => {
      const command = {
        commandName: 'TestCommand',
        payload: { id: 1 },
      };
      const handler = vitest
        .fn()
        .mockRejectedValue(new NoHandlerFoundException('channel'));

      const defaultHandler = vitest.fn().mockResolvedValue('DefaultHandler');

      commandInterceptors = new CommandInterceptors(cache, logger, {
        timeout: 1000,
        retry: { maxAttempts: 3, delay: 100 },
        throttle: { rate: 5, interval: '1s' },
        defaultHandler,
      });

      const interceptors = commandInterceptors.buildInterceptors();

      await expect(interceptors.execute(command, handler)).resolves.toBe(
        'DefaultHandler'
      );
      expect(handler).toHaveBeenCalledTimes(1);
      expect(defaultHandler).toHaveBeenCalledTimes(1);
    });
  });
});
