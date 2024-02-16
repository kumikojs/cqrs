/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QueryContract } from './query';
import { QueryBus, type QueryBusContract } from './query-bus';
import type { QueryHandlerContract } from './query-handler';
import { QueryInterceptorManager } from './internal/query-interceptor-manager';

class TestQuery implements QueryContract {
  queryName: string;

  constructor(queryName: string) {
    this.queryName = queryName;
  }
}

describe('QueryBus', () => {
  let queryBus: QueryBusContract;

  beforeEach(() => {
    queryBus = new QueryBus({
      interceptorManager: new QueryInterceptorManager(),
    });
  });

  describe('register', () => {
    test('should register a query handler as a function and unregister it', () => {
      const queryName = 'testQuery';
      const handler = vitest.fn();

      const unregister = queryBus.bind(queryName).to(handler);

      expect(() => queryBus.execute(new TestQuery(queryName))).not.toThrow();
      expect(handler).toHaveBeenCalledTimes(1);

      unregister();

      expect(() =>
        queryBus.execute(new TestQuery(queryName))
      ).rejects.toThrow();
    });

    test('should register a query handler as an object and unregister it', () => {
      const queryName = 'testQuery';
      const handler = {
        execute: vitest.fn(),
      };

      const unregister = queryBus.bind(queryName).to(handler);

      expect(() => queryBus.execute(new TestQuery(queryName))).not.toThrow();
      expect(handler.execute).toHaveBeenCalledTimes(1);

      unregister();

      expect(() =>
        queryBus.execute(new TestQuery(queryName))
      ).rejects.toThrow();
    });

    test('should register a query handler as a class and unregister it', () => {
      const queryName = 'testQuery';
      class TestQueryHandler implements QueryHandlerContract<TestQuery> {
        execute(): Promise<string> {
          return Promise.resolve('test');
        }
      }

      const handler = new TestQueryHandler();

      const unregister = queryBus.bind(queryName).to(handler);

      expect(() => queryBus.execute(new TestQuery(queryName))).not.toThrow();

      unregister();

      expect(() =>
        queryBus.execute(new TestQuery(queryName))
      ).rejects.toThrow();
    });
  });

  test('should execute a query without interceptor configured', async () => {
    const queryName = 'testQuery';
    const query = new TestQuery(queryName);
    const handler = vitest.fn();

    queryBus.bind(queryName).to(handler);

    await queryBus.execute(query);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(query);
  });

  test('should apply an interceptor globally', async () => {
    const interceptor = vitest.fn();
    const query = new TestQuery('testQuery');
    const query2 = new TestQuery('testQuery2');

    queryBus.bind('testQuery').to(async () => 'test');
    queryBus.bind('testQuery2').to(async () => 'test');
    queryBus.interceptors.apply(interceptor);

    await Promise.all([queryBus.execute(query), queryBus.execute(query2)]);

    expect(interceptor).toHaveBeenCalledWith(query, expect.any(Function));
    expect(interceptor).toHaveBeenCalledWith(query2, expect.any(Function));
  });

  describe('task manager', () => {
    test('should execute the same query only once', async () => {
      const queryName = 'testQuery';
      const handler = vitest.fn().mockResolvedValue('result');

      queryBus.bind(queryName).to(handler);

      const query = new TestQuery(queryName);

      await Promise.all([
        queryBus.execute(query),
        queryBus.execute(query),
        queryBus.execute(query),
      ]);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('should intercept the same query execution and execute the query only once', async () => {
      const queryName = 'testQuery';
      const handler = vitest.fn().mockResolvedValue('result');
      const interceptor = vitest
        .fn()
        .mockImplementation(async (query, next) => {
          return next?.(query);
        });

      queryBus.bind(queryName).to(handler);
      queryBus.interceptors.apply(interceptor);

      const query = new TestQuery(queryName);

      await Promise.all([
        queryBus.execute(query),
        queryBus.execute(query),
        queryBus.execute(query),
      ]);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(interceptor).toHaveBeenCalledTimes(1);
    });
  });

  describe('aborting the query execution', () => {
    test('should stop the execution of the query by using the abort controller from query context', async () => {
      const queryName = 'testQuery';
      const handler = vitest.fn().mockResolvedValue('result');
      const interceptor = vitest
        .fn()
        .mockImplementation(async (query, next) => {
          query.abortController.abort();
          return next?.(query);
        });

      queryBus.bind(queryName).to(handler);
      queryBus.interceptors.apply(interceptor);

      const query = new TestQuery(queryName);

      await expect(queryBus.execute(query)).rejects.toThrow();
      expect(handler).not.toHaveBeenCalled();
      expect(interceptor).toHaveBeenCalledTimes(1);
    });
  });
});
