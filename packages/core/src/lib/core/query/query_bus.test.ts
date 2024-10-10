import { MemoryStorageDriver } from '../../infrastructure/storage/drivers/memory_storage';
import { ResilienceBuilderOptions } from '../../types/core/options/resilience_options';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { QueryBus } from './query_bus';
import { QueryCache } from './query_cache';

describe('QueryBus', () => {
  let bus: QueryBus;
  let cache: QueryCache;
  let logger: KumikoLogger;
  let options: ResilienceBuilderOptions;

  beforeEach(() => {
    cache = new QueryCache({
      l2: {
        driver: new MemoryStorageDriver(),
      },
    });
    logger = new KumikoLogger();
    options = {};

    bus = new QueryBus(cache, logger, options);
  });

  describe('Registration and Dispatching', () => {
    it('should be able to unregister a query handler', () => {
      const handler = vi.fn();

      const unregister = bus.register('test_query', handler);

      unregister();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should be able to register a query handler and dispatch a query', async () => {
      const handler = vi.fn();

      bus.register('test_query', handler);

      await bus.dispatch({
        queryName: 'test_query',
        payload: {},
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should throw an error if trying to register more than one handler for the same query', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      bus.register('test_query', handler1);

      expect(() => {
        bus.register('test_query', handler2);
      }).toThrowError(
        `Limit of 1 handler(s) per channel reached. Channel: 'test_query' not registered.`
      );
    });
  });

  describe('Query Execution', () => {
    it('should be able to execute a query', async () => {
      const handler = vi.fn();

      bus.register('test_query', async () => {
        return;
      });

      await bus.execute(
        {
          queryName: 'test_query',
          payload: {},
        },
        (query) => handler(query)
      );

      expect(handler).toHaveBeenCalled();
    });

    it('should call the interceptor manager execute method when executing a query', async () => {
      const handler = vi.fn();
      const interceptorExecuteSpy = vi.spyOn(bus.interceptors, 'execute');

      bus.register('test_query', async () => {
        return;
      });

      await bus.execute(
        {
          queryName: 'test_query',
          payload: {},
        },
        (query) => handler(query)
      );

      expect(interceptorExecuteSpy).toHaveBeenCalled();
    });
  });

  describe('Interceptors', () => {
    it('should apply interceptors when executing a query', async () => {
      const handler = vi.fn();
      const interceptorSpy = vi.spyOn(bus.interceptors, 'execute');

      bus.register('test_query', handler);

      await bus.execute(
        {
          queryName: 'test_query',
          payload: {},
        },
        (query) => handler(query)
      );

      expect(interceptorSpy).toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });

    it('should call interceptors during dispatching', async () => {
      const interceptorSpy = vi.spyOn(bus.interceptors, 'execute');

      bus.register('test_query', async () => {
        return;
      });

      await bus.dispatch({
        queryName: 'test_query',
        payload: {},
      });

      expect(interceptorSpy).toHaveBeenCalled();
    });
  });

  describe('Disconnection', () => {
    it('should disconnect and clear all handlers and interceptors', async () => {
      const handler = vi.fn();
      bus.register('test_query', handler);

      bus.disconnect();

      await expect(
        bus.dispatch({
          queryName: 'test_query',
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
    it('should throw error if query handler is not found during dispatch', async () => {
      await expect(
        bus.dispatch({
          queryName: 'nonexistent_query',
          payload: {},
        })
      ).rejects.toThrowError(
        `No handler found for this channel: 'nonexistent_query'`
      );
    });

    it('should handle execution errors within query handlers', async () => {
      const faultyHandler = vi
        .fn()
        .mockRejectedValue(new Error('Handler error'));
      bus.register('test_faulty', faultyHandler);

      await expect(
        bus.execute(
          {
            queryName: 'test_faulty',
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
