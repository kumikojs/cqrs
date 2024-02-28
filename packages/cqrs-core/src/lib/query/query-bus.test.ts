/* eslint-disable @typescript-eslint/no-explicit-any */
import type { QueryContract } from './query';
import { QueryBus, type QueryBusContract } from './query-bus';
import type { QueryHandlerContract } from './query-handler';

class TestQuery implements QueryContract {
  queryName: string;

  constructor(queryName: string) {
    this.queryName = queryName;
  }
}

describe('QueryBus', () => {
  let queryBus: QueryBusContract;

  beforeEach(() => {
    queryBus = new QueryBus();
  });

  describe('register', () => {
    test('should register a query handler as a function and unregister it', () => {
      const queryName = 'testQuery';
      const handler = vitest.fn();

      const unregister = queryBus.register(queryName, handler);

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

      const unregister = queryBus.register(queryName, handler);

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

      const unregister = queryBus.register(queryName, handler);

      expect(() => queryBus.execute(new TestQuery(queryName))).not.toThrow();

      unregister();

      expect(() =>
        queryBus.execute(new TestQuery(queryName))
      ).rejects.toThrow();
    });
  });
});
