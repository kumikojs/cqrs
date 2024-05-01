import { Cache } from '../internal/cache/cache';
import { MemoryStorageDriver } from '../internal/storage/drivers/memory_storage';
import { QueryBus } from './query_bus';
import { QueryCache } from './query_cache';

describe('QueryBus', () => {
  let bus: QueryBus;

  beforeEach(() => {
    bus = new QueryBus(
      new QueryCache(
        new Cache(new MemoryStorageDriver()),
        new Cache(new MemoryStorageDriver())
      )
    );
  });

  it('should be able to register a query handler', () => {
    const handler = vitest.fn();

    bus.register('test', handler);

    expect(handler).not.toHaveBeenCalled();
  });

  it('should be able to unregister a query handler', () => {
    const handler = vitest.fn();

    const unregister = bus.register('test', handler);

    unregister();

    expect(handler).not.toHaveBeenCalled();
  });

  it('should be able to dispatch a query', async () => {
    const handler = vitest.fn();

    bus.register('test', handler);

    await bus.dispatch({
      queryName: 'test',
      payload: {},
    });

    expect(handler).toHaveBeenCalled();
  });

  it('should be able to execute a query', async () => {
    const handler = vitest.fn();

    bus.register('test', async () => {
      // Do nothing
    });

    await bus.execute(
      {
        queryName: 'test',
        payload: {},
      },
      (query) => handler(query)
    );

    expect(handler).toHaveBeenCalled();
  });

  describe('cancelQuery', () => {
    it('should be able to cancel an ongoing query', async () => {
      bus.register('test', async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return 'result';
      });

      const promise = bus.dispatch({
        queryName: 'test',
        payload: {},
      });

      bus.cancelQuery('test');

      await expect(promise).rejects.toThrow(`Request 'test' aborted`);
    });

    it('should be able to cancel an ongoing query with a signal', async () => {
      bus.register('test', async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        return 'result';
      });

      const controller = new AbortController();

      const promise = bus.dispatch({
        queryName: 'test',
        payload: {},
        context: { signal: controller.signal },
      });

      controller.abort();

      expect(promise).rejects.toThrow(`Request 'test' aborted`);
    });
  });
});
