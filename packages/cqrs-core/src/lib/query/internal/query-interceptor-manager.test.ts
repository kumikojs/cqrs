import {
  BulkheadException,
  BulkheadStrategy,
} from '../../strategy/bulkhead-strategy';
import { ThrottleException } from '../../strategy/throttle-strategy';
import { TimeoutException } from '../../strategy/timeout-strategy';
import { QueryInterceptorManager } from './query-interceptor-manager';

import type { QueryContract } from '../query';

describe('QueryInterceptorManager', () => {
  let queryInterceptorManager: QueryInterceptorManager<QueryContract>;

  beforeEach(() => {
    queryInterceptorManager = new QueryInterceptorManager({
      strategies: {
        bulkhead: {
          strategy: new BulkheadStrategy({
            maxConcurrent: 1,
            maxQueue: 2,
          }),
        },
      },
    });
  });

  test('should successfully execute the query', async () => {
    const query = {
      queryName: 'testQuery',
    } as QueryContract;

    const result = await queryInterceptorManager.execute(query, async () => {
      return 'test';
    });

    expect(result).toBe('test');
  });

  describe('unit tests', () => {
    test('should apply the cache strategy', async () => {
      const query = {
        queryName: 'testQuery',
        options: {
          cache: {
            ttl: 1000,
            persist: false,
          },
        },
      } as QueryContract;
      let i = 0;

      const result = await queryInterceptorManager.execute(query, async () => {
        i++;
        return i;
      });
      const result2 = await queryInterceptorManager.execute(query, async () => {
        return i;
      });

      expect(result).toBe(1);
      expect(result2).toBe(result);
    });

    test('should apply the fallback strategy', async () => {
      const query = {
        queryName: 'testQuery',
        payload: 'testPayload',
        options: { fallback: () => 'fallback' },
      } as QueryContract;

      const result = await queryInterceptorManager.execute(query, async () => {
        throw new Error('error');
      });

      expect(result).toBe('fallback');
    });

    test('should apply the retry strategy', async () => {
      const query = {
        queryName: 'testQuery',
        options: {
          retry: {
            maxAttempts: 1,
            delay: 1000,
          },
        },
      } as QueryContract;
      let i = 0;

      const result = await queryInterceptorManager.execute(query, async () => {
        if (i === 0) {
          i++;
          throw new Error('error');
        }

        return i;
      });

      expect(result).toBe(1);
    });

    test('should apply the timeout strategy', async () => {
      const query = {
        queryName: 'testQuery',
        options: {
          timeout: 1000,
        },
      } as QueryContract;

      expect(
        queryInterceptorManager.execute(query, async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        })
      ).rejects.toThrow(TimeoutException);
    });

    test('should apply the bulkhead strategy', async () => {
      const query = {
        queryName: 'testQuery',
        options: {
          bulkhead: true,
        },
      } as QueryContract;
      let i = 0;

      const result = queryInterceptorManager.execute(query, async () => {
        return ++i;
      });

      const result2 = queryInterceptorManager.execute(query, async () => {
        return ++i;
      });

      const result3 = queryInterceptorManager.execute(query, async () => {
        return ++i;
      });

      const result4 = queryInterceptorManager.execute(query, async () => {
        return ++i;
      });

      expect(result).resolves.toBe(1);
      expect(result2).resolves.toBe(2);
      expect(result3).resolves.toBe(3);
      expect(result4).rejects.toThrowError(BulkheadException);
    });

    test('should apply the throttle strategy', async () => {
      const query = {
        queryName: 'testQuery',
        options: {
          throttle: {
            rate: 2,
            interval: 1000,
          },
        },
      } as QueryContract;
      let i = 0;

      const result = queryInterceptorManager.execute(query, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return ++i;
      });

      const result2 = queryInterceptorManager.execute(query, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return ++i;
      });

      const result3 = queryInterceptorManager.execute(query, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return ++i;
      });

      expect(result).resolves.toBe(1);
      expect(result2).resolves.toBe(2);
      expect(result3).rejects.toThrowError(ThrottleException);
    });
  });

  describe('integration tests', () => {
    describe('caching strategy is the first strategy', () => {
      test('should apply the cache before the fallback strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            cache: { ttl: 1000, persist: false },
            fallback: () => 'fallback',
          },
        } as QueryContract;
        let i = 0;

        const result = await queryInterceptorManager.execute(
          query,
          async () => {
            if (i++ === 1) {
              throw new Error('error');
            }

            return i;
          }
        );
        const result2 = await queryInterceptorManager.execute(
          query,
          async () => {
            return i;
          }
        );

        expect(result).toBe(1);
        expect(result2).toBe(result);
      });

      test('should apply the cache before the retry strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            cache: { ttl: 1000, persist: false },
            retry: { maxAttempts: 1, delay: 1000 },
          },
        } as QueryContract;
        let i = 0;

        const result = await queryInterceptorManager.execute(
          query,
          async () => {
            if (i === 0) {
              i++;
              throw new Error('error');
            }

            return i;
          }
        );

        const result2 = await queryInterceptorManager.execute(
          query,
          async () => {
            return i;
          }
        );

        expect(result).toBe(1);
        expect(result2).toBe(result);
      });

      test('should apply the cache before the timeout strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            cache: { ttl: 1000, persist: false },
            timeout: 1000,
          },
        } as QueryContract;

        const result = await queryInterceptorManager.execute(
          query,
          async () => {
            return 'first';
          }
        );

        const result2 = await queryInterceptorManager.execute(
          query,
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));

            return 'second';
          }
        );

        expect(result).toBe('first');
        expect(result2).toBe(result);
      });

      test('should apply the cache before the bulkhead strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            cache: { ttl: 1000, persist: false },
            bulkhead: true,
          },
        } as QueryContract;
        let i = 0;

        const result = queryInterceptorManager.execute(query, async () => {
          return ++i;
        });

        const result2 = queryInterceptorManager.execute(query, async () => {
          return ++i;
        });

        const result3 = queryInterceptorManager.execute(query, async () => {
          return ++i;
        });

        const result4 = queryInterceptorManager.execute(query, async () => {
          return ++i;
        });

        expect(result).resolves.toBe(1);
        expect(result2).resolves.toBe(2);
        expect(result3).resolves.toBe(3);
        expect(result4).rejects.toThrowError(BulkheadException);
      });

      test('should apply the cache before the throttle strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            cache: { ttl: 1000, persist: false },
            throttle: { rate: 2, interval: 1000 },
          },
        } as QueryContract;
        let i = 0;

        const result = queryInterceptorManager.execute(query, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return ++i;
        });

        const result2 = queryInterceptorManager.execute(query, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return ++i;
        });

        const result3 = queryInterceptorManager.execute(query, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return ++i;
        });

        expect(result).resolves.toBe(1);
        expect(result2).resolves.toBe(2);
        expect(result3).rejects.toThrowError(ThrottleException);
      });
    });

    describe('fallback strategy is the second strategy', () => {
      test('should apply the fallback before the retry strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            fallback: () => 'fallback',
            retry: { maxAttempts: 1, delay: 1000 },
          },
        } as QueryContract;

        const result = await queryInterceptorManager.execute(
          query,
          async () => {
            throw new Error('error');
          }
        );

        expect(result).toBe('fallback');
      });

      test('should apply the fallback before the timeout strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            fallback: () => 'fallback',
            timeout: 1000,
          },
        } as QueryContract;

        expect(
          queryInterceptorManager.execute(query, async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          })
        ).resolves.toBe('fallback');
      });

      test('should apply the fallback before the bulkhead strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            fallback: () => 'fallback',
            bulkhead: true,
          },
        } as QueryContract;

        const result = Promise.all([
          queryInterceptorManager.execute(query, async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return 'success';
          }),
          queryInterceptorManager.execute(query, async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return 'success';
          }),
          queryInterceptorManager.execute(query, async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return 'success';
          }),
          queryInterceptorManager.execute(query, async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }),
        ]);

        expect(result).resolves.toStrictEqual([
          'success',
          'success',
          'success',
          'fallback',
        ]);
      });

      test('should apply the fallback before the throttle strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            fallback: () => 'fallback',
            throttle: { rate: 2, interval: 1000 },
          },
        } as QueryContract;

        const result = Promise.all([
          queryInterceptorManager.execute(query, async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return 'success';
          }),
          queryInterceptorManager.execute(query, async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return 'success';
          }),
          queryInterceptorManager.execute(query, async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return 'success';
          }),
          queryInterceptorManager.execute(query, async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }),
        ]);

        expect(result).resolves.toStrictEqual([
          'success',
          'success',
          'fallback',
          'fallback',
        ]);
      });
    });

    describe('retry strategy is the third strategy', () => {
      test('should apply the retry before the timeout strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            retry: { maxAttempts: 1, delay: 1000 },
            timeout: 1000,
          },
        } as QueryContract;
        let i = 0;

        const result = await queryInterceptorManager.execute(
          query,
          async () => {
            if (i === 0) {
              i++;
              throw new Error('error');
            }

            return i;
          }
        );

        expect(result).toBe(1);
      });

      test('should apply the retry before the bulkhead strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            retry: { maxAttempts: 1, delay: 1000 },
            bulkhead: true,
          },
        } as QueryContract;
        let i = 0;

        const result = queryInterceptorManager.execute(query, async () => {
          if (i === 0) {
            i++;
            throw new Error('error');
          }

          return i;
        });

        expect(result).resolves.toBe(1);
      });

      test('should apply the retry before the throttle strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            retry: { maxAttempts: 1, delay: 1000 },
            throttle: { rate: 2, interval: 1000 },
          },
        } as QueryContract;
        let i = 0;

        const result = queryInterceptorManager.execute(query, async () => {
          if (i === 0) {
            i++;
            throw new Error('error');
          }

          return i;
        });

        expect(result).resolves.toBe(1);
      });
    });

    describe('timeout strategy is the fourth strategy', () => {
      test('should apply the timeout before the bulkhead strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            timeout: 1000,
            bulkhead: true,
          },
        } as QueryContract;

        expect(
          queryInterceptorManager.execute(query, async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          })
        ).rejects.toThrow(TimeoutException);
      });

      test('should apply the timeout before the throttle strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            timeout: 1000,
            throttle: { rate: 2, interval: 1000 },
          },
        } as QueryContract;

        expect(
          queryInterceptorManager.execute(query, async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          })
        ).rejects.toThrow(TimeoutException);
      });
    });

    describe('bulkhead strategy is the fifth strategy', () => {
      test('should apply the bulkhead before the throttle strategy', async () => {
        const query = {
          queryName: 'testQuery',
          options: {
            throttle: { rate: 4, interval: 1000 },
            bulkhead: true,
          },
        } as QueryContract;
        let i = 0;

        const result = queryInterceptorManager.execute(query, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return ++i;
        });

        const result2 = queryInterceptorManager.execute(query, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return ++i;
        });

        const result3 = queryInterceptorManager.execute(query, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return ++i;
        });

        const result4 = queryInterceptorManager.execute(query, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return ++i;
        });

        expect(result).resolves.toBe(1);
        expect(result2).resolves.toBe(2);
        expect(result3).resolves.toBe(3);
        expect(result4).rejects.toThrowError(BulkheadException);
      });
    });
  });
});
