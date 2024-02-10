/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InterceptorContract } from './interceptor';
import {
  InterceptorManager,
  type InterceptorManagerContract,
} from './interceptor-manager';

const mockInterceptor: InterceptorContract<any> = {
  handle: async (request, next) => {
    if (next) {
      const modifiedContext = { ...request, modified: true };
      return await next(modifiedContext);
    }
    return request;
  },
};

describe('InterceptorManager', () => {
  let interceptorManager: InterceptorManagerContract<any>;

  beforeEach(() => {
    interceptorManager = new InterceptorManager();
  });

  test('should execute interceptors in the correct order', async () => {
    interceptorManager.use(mockInterceptor);
    interceptorManager.use(mockInterceptor);

    const result = await interceptorManager.execute(
      { initial: true },
      async (request) => {
        return request;
      }
    );

    expect(result).toEqual({ initial: true, modified: true });
  });

  test('should handle case with no interceptors', async () => {
    const result = await interceptorManager.execute(
      { initial: true },
      async (request) => {
        return request;
      }
    );

    expect(result).toEqual({ initial: true });
  });

  test('should handle async handlers', async () => {
    interceptorManager.use(mockInterceptor);

    const result = await interceptorManager.execute(
      { initial: true },
      async (request) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(request);
          }, 100);
        });
      }
    );

    expect(result).toEqual({ initial: true, modified: true });
  });

  test('should handle error in handler', async () => {
    interceptorManager.use(mockInterceptor);

    const errorHandler = vitest.fn();

    try {
      await interceptorManager.execute({ initial: true }, async () => {
        throw new Error('Test error');
      });
    } catch (error) {
      errorHandler(error);
    }

    expect(errorHandler).toHaveBeenCalled();
  });
});
