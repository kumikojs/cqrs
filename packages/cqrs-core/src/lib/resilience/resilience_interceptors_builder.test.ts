/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Cache } from '../internal/cache/cache';
import { InterceptorManager } from '../internal/interceptor/interceptor_manager';
import { ResilienceInterceptorsBuilder } from './resilience_interceptors_builder';

describe('ResilienceInterceptorsBuilder', () => {
  it('should build resilience interceptors', async () => {
    const cache = new Cache();
    const resilienceInterceptorsBuilder = new ResilienceInterceptorsBuilder(
      cache,
      {
        serialize: (request) => JSON.stringify(request),
      }
    );

    resilienceInterceptorsBuilder
      .addRetryInterceptor()
      .addTimeoutInterceptor()
      .addThrottleInterceptor()
      .addFallbackInterceptor()
      .addCacheInterceptor()
      .addDeduplicationInterceptor();

    const interceptors = resilienceInterceptorsBuilder.build();

    expect(interceptors).toBeDefined();
    expect(interceptors).toBeInstanceOf(InterceptorManager);
  });

  it('should intercept in the order they were added', async () => {
    const cache = new Cache();
    const resilienceInterceptorsBuilder = new ResilienceInterceptorsBuilder(
      cache,
      {
        serialize: (request) => JSON.stringify(request),
      }
    );

    const order: string[] = [];

    const interceptors = resilienceInterceptorsBuilder.build();

    interceptors.tap(
      () => true,
      async (command, next) => {
        order.push('retry');
        return next?.(command);
      }
    );

    interceptors.tap(
      () => true,
      async (command, next) => {
        order.push('timeout');
        return next?.(command);
      }
    );

    interceptors.tap(
      () => true,
      async (command, next) => {
        order.push('throttle');
        return next?.(command);
      }
    );

    interceptors.use(async (command, next) => {
      order.push('fallback');
      return next?.(command);
    });

    interceptors.tap(
      () => true,
      async (command, next) => {
        order.push('cache');
        return next?.(command);
      }
    );

    interceptors.use(async (command, next) => {
      order.push('deduplication');
      return next?.(command);
    });

    await interceptors.execute({}, async () => {});

    expect(order).toEqual([
      'retry',
      'timeout',
      'throttle',
      'fallback',
      'cache',
      'deduplication',
    ]);
  });
});
