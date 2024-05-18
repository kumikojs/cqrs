/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryCache } from './query_cache';
import { QueryInterceptors } from './query_interceptors';

import type { InterceptorManagerContract } from '../../types/infrastructure/interceptor';
import type { Query } from '../../types/core/query';

describe('QueryInterceptors', () => {
  let cache: QueryCache;
  let interceptorManager: InterceptorManagerContract<any>;

  beforeEach(() => {
    cache = new QueryCache();
    interceptorManager = new QueryInterceptors(cache).buildInterceptors();
  });

  it('cache key should be the serialized query', async () => {
    const query: Query<'test', { id: string }> = {
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

    const cacheValue = cache.l1.get(query.queryName, serializedQuery);

    expect(cacheValue).toBe('cached value');
  });
});
