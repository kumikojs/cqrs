/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from '../client';
import { QuerySubject } from './query_subject';

import type { QueryContract } from './query_contracts';

describe('QuerySubject', () => {
  type TestQuery = QueryContract<'test', { id: string }>;
  let client: Client;

  beforeEach(() => {
    client = new Client();
  });

  describe('execute', () => {
    it('should execute the query', async () => {
      const query: TestQuery = {
        queryName: 'test',
      };
      const handlerFn = vitest.fn().mockResolvedValue('result');

      const querySubject = new QuerySubject(query, client, handlerFn);

      const result = await querySubject.execute(query);

      expect(result).toBe('result');
      expect(handlerFn).toHaveBeenCalledWith(query);
    });
  });

  describe('subscribe', () => {
    it('should subscribe to the query state changes', async () => {
      const onStateChange = vitest.fn();

      const querySubject = new QuerySubject(
        {
          queryName: 'test',
        },
        client,
        async () => {
          return 'result';
        }
      );

      const unsubscribe = querySubject.subscribe(onStateChange);

      querySubject.execute({
        queryName: 'test',
      });

      expect(onStateChange).toHaveBeenCalledTimes(1);

      unsubscribe();

      expect(onStateChange).toHaveBeenCalledTimes(1);
    });

    it('should subscribe to the cache invalidation events', () => {
      const onInvalidate = vitest.fn();

      client.cache.onInvalidate('test', () => {
        onInvalidate();
      });

      const querySubject = new QuerySubject(
        {
          queryName: 'test',
        },
        client,
        async () => {
          return 'result';
        }
      );

      client.cache.inMemoryCache.set('test', 'queryName:test', 'result');

      querySubject.execute({
        queryName: 'test',
      });

      expect(onInvalidate).not.toHaveBeenCalled();

      client.cache.invalidate('test');

      expect(onInvalidate).toHaveBeenCalledTimes(1);
    });

    it('should re-execute the query when the cache is invalidated', async () => {
      const handlerFn = vitest.fn();

      const querySubject = new QuerySubject(
        {
          queryName: 'test',
        },
        client,
        async () => {
          handlerFn();
          return 'result';
        }
      );

      await querySubject.execute({
        queryName: 'test',
      });

      client.cache.invalidate('test');

      expect(handlerFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('state', () => {
    it('should return the operation state', async () => {
      const querySubject = new QuerySubject(
        {
          queryName: 'test',
        },
        client,
        async () => {
          return 'result';
        }
      );

      expect(querySubject.state.isIdle).toBeTruthy();

      await querySubject.execute({
        queryName: 'test',
      });

      console.log(querySubject.state);

      expect(querySubject.state.isFulfilled).toBeTruthy();
    });
  });
});
