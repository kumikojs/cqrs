import { Cache } from '../internal/cache/cache_manager';
import { QueryBus } from './query_bus';

describe('QueryBus', () => {
  let bus: QueryBus;

  beforeEach(() => {
    bus = new QueryBus(new Cache());
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
});
