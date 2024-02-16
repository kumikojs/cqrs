import type { QueryContract } from '../query';

import { QueryInterceptorManager } from './query-interceptor-manager';

class TestQuery implements QueryContract {
  constructor(
    public queryName: string,
    public options: Record<string, unknown> = {}
  ) {}
}

describe('QueryInterceptorManager', () => {
  let interceptorManager: QueryInterceptorManager;

  beforeEach(() => {
    interceptorManager = new QueryInterceptorManager();
  });

  test('should apply an interceptor globally', async () => {
    const interceptor = vitest.fn();
    const query = new TestQuery('testQuery');
    const query2 = new TestQuery('testQuery2');

    interceptorManager.apply(interceptor);

    await interceptorManager.execute(query, async () => 'test');
    await interceptorManager.execute(query2, async () => 'test');

    expect(interceptor).toHaveBeenCalledWith(query, expect.any(Function));
    expect(interceptor).toHaveBeenCalledWith(query2, expect.any(Function));
  });

  test('should apply an interceptor to a specific query', async () => {
    const interceptor = vitest.fn();
    const query = new TestQuery('testQuery');
    const query2 = new TestQuery('testQuery2');

    interceptorManager
      .select((query) => query.queryName === 'testQuery')
      .apply(interceptor);

    await interceptorManager.execute(query, async () => 'test');
    await interceptorManager.execute(query2, async () => 'test');

    expect(interceptor).toHaveBeenCalledWith(query, expect.any(Function));
    expect(interceptor).not.toHaveBeenCalledWith(query2, expect.any(Function));
  });

  test('should apply an interceptor to a list of querys', async () => {
    const interceptor = vitest.fn();
    const query = new TestQuery('testQuery');
    const query2 = new TestQuery('testQuery2');
    const query3 = new TestQuery('testQuery3');

    interceptorManager
      .select((query) => ['testQuery', 'testQuery2'].includes(query.queryName))
      .apply(interceptor);

    await interceptorManager.execute(query, async () => 'test');
    await interceptorManager.execute(query2, async () => 'test');
    await interceptorManager.execute(query3, async () => 'test');

    expect(interceptor).toHaveBeenCalledWith(query, expect.any(Function));
    expect(interceptor).toHaveBeenCalledWith(query2, expect.any(Function));
    expect(interceptor).not.toHaveBeenCalledWith(query3, expect.any(Function));
  });

  test('should apply an interceptor to a specific query based on options', async () => {
    const interceptor = vitest.fn();
    const query = new TestQuery('testQuery', { notifiable: true });
    const query2 = new TestQuery('testQuery2', { notifiable: false });

    interceptorManager
      .select<{
        queryName: string;
        options: { notifiable: boolean };
      }>((query) => query.options.notifiable)
      .apply(interceptor);

    await interceptorManager.execute(query, async () => 'test');
    await interceptorManager.execute(query2, async () => 'test');

    expect(interceptor).toHaveBeenCalledWith(query, expect.any(Function));
    expect(interceptor).not.toHaveBeenCalledWith(query2, expect.any(Function));
  });
});
