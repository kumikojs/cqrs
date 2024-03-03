import { ThrottleException } from '../../strategy/throttle-strategy';
import { TimeoutException } from '../../strategy/timeout-strategy';
import { CommandInterceptorManager } from './command-interceptor-manager';

import type { CommandContract } from '../command';

describe('CommandInterceptorManager', () => {
  let commandInterceptorManager: CommandInterceptorManager<CommandContract>;

  beforeEach(() => {
    commandInterceptorManager = new CommandInterceptorManager();
  });

  test('should successfully execute the command', async () => {
    const command = {
      commandName: 'testCommand',
    } as CommandContract;

    const result = await commandInterceptorManager.execute(
      command,
      async () => {
        return 'test';
      }
    );

    expect(result).toBe('test');
  });

  describe('unit tests', () => {
    test('should apply the fallback strategy', async () => {
      const command = {
        commandName: 'testCommand',
        payload: 'testPayload',
        options: { fallback: () => 'fallback' },
      } as CommandContract;

      const result = await commandInterceptorManager.execute(
        command,
        async () => {
          throw new Error('error');
        }
      );

      expect(result).toBe('fallback');
    });

    test('should apply the retry strategy', async () => {
      const command = {
        commandName: 'testCommand',
        options: {
          retry: {
            maxAttempts: 1,
            delay: 1000,
          },
        },
      } as CommandContract;
      let i = 0;

      const result = await commandInterceptorManager.execute(
        command,
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

    test('should apply the timeout strategy', async () => {
      const command = {
        commandName: 'testCommand',
        options: {
          timeout: 1000,
        },
      } as CommandContract;

      expect(
        commandInterceptorManager.execute(command, async () => {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        })
      ).rejects.toThrow(TimeoutException);
    });

    test('should apply the throttle strategy', async () => {
      const command = {
        commandName: 'testCommand',
        options: {
          throttle: {
            rate: 2,
            interval: 1000,
          },
        },
      } as CommandContract;
      let i = 0;

      const result = commandInterceptorManager.execute(command, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return ++i;
      });

      const result2 = commandInterceptorManager.execute(command, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return ++i;
      });

      const result3 = commandInterceptorManager.execute(command, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return ++i;
      });

      expect(result).resolves.toBe(1);
      expect(result2).resolves.toBe(2);
      expect(result3).rejects.toThrowError(ThrottleException);
    });
  });

  describe('integration tests', () => {
    describe('fallback strategy is the first strategy', () => {
      test('should apply the fallback before the retry strategy', async () => {
        const command = {
          commandName: 'testCommand',
          options: {
            fallback: () => 'fallback',
            retry: { maxAttempts: 1, delay: 1000 },
          },
        } as CommandContract;

        const result = await commandInterceptorManager.execute(
          command,
          async () => {
            throw new Error('error');
          }
        );

        expect(result).toBe('fallback');
      });

      test('should apply the fallback before the timeout strategy', async () => {
        const command = {
          commandName: 'testCommand',
          options: {
            fallback: () => 'fallback',
            timeout: 1000,
          },
        } as CommandContract;

        expect(
          commandInterceptorManager.execute(command, async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          })
        ).resolves.toBe('fallback');
      });

      test('should apply the fallback before the throttle strategy', async () => {
        const command = {
          commandName: 'testCommand',
          options: {
            fallback: () => 'fallback',
            throttle: { rate: 2, interval: 1000 },
          },
        } as CommandContract;

        const result = Promise.all([
          commandInterceptorManager.execute(command, async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return 'success';
          }),
          commandInterceptorManager.execute(command, async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return 'success';
          }),
          commandInterceptorManager.execute(command, async () => {
            await new Promise((resolve) => setTimeout(resolve, 100));
            return 'success';
          }),
          commandInterceptorManager.execute(command, async () => {
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

    describe('retry strategy is the second strategy', () => {
      test('should apply the retry before the timeout strategy', async () => {
        const command = {
          commandName: 'testCommand',
          options: {
            retry: { maxAttempts: 1, delay: 1000 },
            timeout: 1000,
          },
        } as CommandContract;
        let i = 0;

        const result = await commandInterceptorManager.execute(
          command,
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

      test('should apply the retry before the throttle strategy', async () => {
        const command = {
          commandName: 'testCommand',
          options: {
            retry: { maxAttempts: 1, delay: 1000 },
            throttle: { rate: 2, interval: 1000 },
          },
        } as CommandContract;
        let i = 0;

        const result = commandInterceptorManager.execute(command, async () => {
          if (i === 0) {
            i++;
            throw new Error('error');
          }

          return i;
        });

        expect(result).resolves.toBe(1);
      });
    });

    describe('timeout strategy is the third strategy', () => {
      test('should apply the timeout before the throttle strategy', async () => {
        const command = {
          commandName: 'testCommand',
          options: {
            timeout: 1000,
            throttle: { rate: 2, interval: 1000 },
          },
        } as CommandContract;

        expect(
          commandInterceptorManager.execute(command, async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          })
        ).rejects.toThrow(TimeoutException);
      });
    });
  });
});
