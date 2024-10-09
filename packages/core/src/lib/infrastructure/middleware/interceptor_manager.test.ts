/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InterceptorManagerContract } from '../../types/main';
import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { InterceptorManager } from './interceptor_manager';

const createMockInterceptor = (modification: string) => ({
  handle: vi.fn(async (request: any, next?: any) => {
    const modifiedContext = { ...request, [modification]: true };
    return next ? await next(modifiedContext) : modifiedContext;
  }),
});

describe('InterceptorManager', () => {
  let interceptorManager: InterceptorManagerContract<any>;

  beforeEach(() => {
    interceptorManager = new InterceptorManager(new KumikoLogger());
  });

  test('should execute interceptors in the correct order', async () => {
    const mockInterceptor1 = createMockInterceptor('modified');
    const mockInterceptor2 = createMockInterceptor('modified2');

    interceptorManager.use(mockInterceptor1);
    interceptorManager.use(mockInterceptor2);

    const result = await interceptorManager.execute(
      { initial: true },
      async (request) => request
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

  test('should return original request when no interceptors are registered', async () => {
    const result = await interceptorManager.execute(
      { initial: true },
      async (request) => request
    );

    expect(result).toEqual({ initial: true });
  });

  test('should handle async handlers correctly', async () => {
    const mockInterceptor = createMockInterceptor('modified');
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

  test('should catch errors thrown by handlers', async () => {
    interceptorManager.use(createMockInterceptor('modified'));

    const errorHandler = vi.fn();

    await interceptorManager
      .execute({ initial: true }, async () => {
        throw new Error('Test error');
      })
      .catch(errorHandler);

    expect(errorHandler).toHaveBeenCalled();
  });
});
