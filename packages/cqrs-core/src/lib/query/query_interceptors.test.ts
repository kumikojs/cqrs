/* eslint-disable @typescript-eslint/no-explicit-any */
import { Cache } from '../internal/cache/cache';
import { QueryInterceptors } from './query_interceptors';

import type { InterceptorManagerContract } from '../internal/interceptor/interceptor_contracts';
import type { QueryContract } from './query_contracts';

describe('QueryInterceptors', () => {
  let cache: Cache;
  let interceptorManager: InterceptorManagerContract<any>;

  beforeEach(() => {
    cache = new Cache();
    interceptorManager = new QueryInterceptors(cache).buildInterceptors();
  });

  it('cache key should be the serialized query', async () => {
    const query: QueryContract<'test', { id: string }> = {
      queryName: 'test',
      payload: { id: '1' },
      options: {
        cache: true,
      },
    };

    const serializedQuery = JSON.stringify({
      queryName: query.queryName,
      payload: query.payload,
    });

    await interceptorManager.execute(query, async () => {
      return 'cached value';
    });

    const cacheValue = cache.inMemoryCache.get(
      query.queryName,
      serializedQuery
    );

    expect(cacheValue).toBe('cached value');
  });
});
