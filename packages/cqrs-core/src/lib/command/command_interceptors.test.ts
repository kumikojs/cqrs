import { Cache } from '../internal/cache/cache';
import { CommandInterceptors } from './command_interceptors';

import type { InterceptorManagerContract } from '../internal/interceptor/contracts';
import type { CommandContract } from './contracts';

describe('CommandInterceptors', () => {
  let cache: Cache;
  let interceptorManager: InterceptorManagerContract<any>;

  beforeEach(() => {
    cache = new Cache();
    interceptorManager = new CommandInterceptors(cache).buildInterceptors();

    vi.useFakeTimers();
  });

  it('should invalidate in-memory queries after the command is executed', async () => {
    const invalidate = vitest.fn();
    const handler = vitest.fn();

    type TestCommand = CommandContract<'test', { id: string }>;

    const command: TestCommand = {
      commandName: 'test',
      payload: { id: '1' },
      options: {
        invalidateQueries: true,
        queries: ['query'],
      },
    };

    cache.inMemoryCache.set('query', 'cached_key', 'cached value');

    cache.onInvalidate('query', invalidate);

    await interceptorManager.execute(command, handler);

    expect(handler).toHaveBeenCalledOnce();

    // Invalidates the memory cache
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('should invalidate local queries after the command is executed', async () => {
    const invalidate = vitest.fn();
    const handler = vitest.fn();

    type TestCommand = CommandContract<'test', { id: string }>;

    const command: TestCommand = {
      commandName: 'test',
      payload: { id: '1' },
      options: {
        invalidateQueries: true,
        queries: ['query'],
      },
    };

    cache.localStorageCache.set('query', 'cached_key', 'cached value');

    cache.onInvalidate('query', invalidate);

    await interceptorManager.execute(command, handler);

    expect(handler).toHaveBeenCalledOnce();

    // Invalidates the local storage cache
    expect(invalidate).toHaveBeenCalledTimes(1);

    cache.localStorageCache.delete('query', 'cached_key');
  });

  it('should invalidate both in-memory and local queries after the command is executed', async () => {
    const invalidate = vitest.fn();
    const handler = vitest.fn();

    type TestCommand = CommandContract<'test', { id: string }>;

    const command: TestCommand = {
      commandName: 'test',
      payload: { id: '1' },
      options: {
        invalidateQueries: true,
        queries: ['query'],
      },
    };

    cache.inMemoryCache.set('query', 'cached_key', 'cached value');
    cache.localStorageCache.set('query', 'cached_key', 'cached value');

    cache.onInvalidate('query', invalidate);

    await interceptorManager.execute(command, handler);

    expect(handler).toHaveBeenCalledOnce();

    expect(invalidate).toHaveBeenCalledTimes(2);
  });
});
