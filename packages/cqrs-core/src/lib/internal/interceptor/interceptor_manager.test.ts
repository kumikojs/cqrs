/* eslint-disable @typescript-eslint/no-explicit-any */
import { InterceptorManager } from './interceptor_manager';

import type {
  InterceptorContract,
  InterceptorManagerContract,
} from './interceptor_contracts';

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
    const mockInterceptor1 = {
      handle: vitest.fn(async (request, next) => {
        if (next) {
          const modifiedContext = { ...request, modified: true };
          return await next(modifiedContext);
        }
        return request;
      }),
    };
    const mockInterceptor2 = {
      handle: vitest.fn(async (request, next) => {
        if (next) {
          const modifiedContext = { ...request, modified2: true };
          return await next(modifiedContext);
        }
        return request;
      }),
    };

    interceptorManager.use(mockInterceptor1);
    interceptorManager.use(mockInterceptor2);

    const result = await interceptorManager.execute(
      { initial: true },
      async (request) => {
        return request;
      }
    );

    expect(result).toEqual({
      initial: true,
      modified: true,
      modified2: true,
    });

    expect(mockInterceptor1.handle).toHaveBeenCalledWith(
      { initial: true },
      expect.any(Function)
    );
    expect(mockInterceptor2.handle).toHaveBeenCalledWith(
      { initial: true, modified: true },
      expect.any(Function)
    );
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
