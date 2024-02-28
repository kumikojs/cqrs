import { CacheManager } from '../../internal/cache/cache-manager';
import { InterceptorManager } from '../../internal/interceptor/interceptor-manager';
import {
  BulkheadStrategy,
  type BulkheadOptions,
} from '../../strategy/bulkhead-strategy';
import { FallbackStrategy } from '../../strategy/fallback-strategy';
import { Strategy } from '../../strategy/internal/strategy';
import { RetryStrategy } from '../../strategy/retry-strategy';
import { ThrottleStrategy } from '../../strategy/throttle-strategy';
import { TimeoutStrategy } from '../../strategy/timeout-strategy';

import type { CommandContract } from '../command';

type CommandInterceptorProps = {
  cache: CacheManager;
  strategies: {
    bulkhead: { strategy?: Strategy<BulkheadOptions>; enabled?: boolean };
  };
};

export class CommandInterceptorManager<
  BaseCommand extends CommandContract
> extends InterceptorManager<BaseCommand> {
  #props: CommandInterceptorProps;

  constructor({ cache, strategies }: Partial<CommandInterceptorProps> = {}) {
    super();

    this.#props = {
      cache: cache || new CacheManager(),
      strategies: {
        bulkhead: {
          strategy: strategies?.bulkhead?.strategy ?? new BulkheadStrategy(),
          enabled: strategies?.bulkhead?.enabled ?? true,
        },
      },
    };
    this.#setup();

    this.use = this.use.bind(this);
    this.tap = this.tap.bind(this);
    this.execute = this.execute.bind(this);
  }

  #setup() {
    this.#setupFallbackInterceptor();
    this.#setupRetryInterceptor();
    this.#setupTimeoutInterceptor();

    if (this.#props.strategies.bulkhead.enabled) {
      this.#setupBulkheadInterceptor();
    }

    this.#setupThrottleInterceptor();
  }

  #setupFallbackInterceptor() {
    this.use(async (command, next) => {
      if (command?.options?.fallback) {
        const strategy = new FallbackStrategy({
          fallback: command.options.fallback,
        });

        return strategy.execute(command, async (request) => next?.(request));
      }

      return next?.(command);
    });
  }

  #setupRetryInterceptor() {
    this.tap(
      (command) => Boolean(command.options?.retry),
      async (command, next) => {
        const strategy = new RetryStrategy(command.options?.retry);

        return strategy.execute(command, async (request) => next?.(request));
      }
    );
  }

  #setupTimeoutInterceptor() {
    this.tap(
      (command) => Boolean(command.options?.timeout),
      async (command, next) => {
        const strategy = new TimeoutStrategy({
          timeout: command.options?.timeout,
        });

        return strategy.execute(command, async (request) => next?.(request));
      }
    );
  }

  #setupBulkheadInterceptor() {
    this.tap(
      (command) => Boolean(command.options?.bulkhead),
      async (command, next) => {
        return this.#props.strategies.bulkhead.strategy?.execute(
          command,
          async (request) => next?.(request)
        );
      }
    );
  }

  #setupThrottleInterceptor() {
    this.tap(
      (command) => Boolean(command.options?.throttle),
      async (command, next) => {
        const strategy = new ThrottleStrategy(this.#props.cache.inMemoryCache, {
          ...command.options?.throttle,
          serialize: (request) =>
            JSON.stringify({
              name: request.commandName,
              payload: request.payload,
            }),
        });

        return strategy.execute(command, async (request) => next?.(request));
      }
    );
  }
}
