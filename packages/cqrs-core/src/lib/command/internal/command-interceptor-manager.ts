import { CacheManager } from '../../internal/cache/cache-manager';
import { InterceptorManager } from '../../internal/interceptor/interceptor-manager';
import { FallbackStrategy } from '../../strategy/fallback-strategy';
import { RetryStrategy } from '../../strategy/retry-strategy';
import { ThrottleStrategy } from '../../strategy/throttle-strategy';
import { TimeoutStrategy } from '../../strategy/timeout-strategy';

import type { RetryOptions } from '../../strategy/retry-strategy';
import type { ThrottleOptions } from '../../strategy/throttle-strategy';
import type { TimeoutOptions } from '../../strategy/timeout-strategy';
import type { CommandContract } from '../command';

type CommandInterceptorProps = Readonly<{
  cache: CacheManager;
  strategies?: {
    fallback?: {
      enabled?: boolean;
    };
    retry?: {
      enabled?: boolean;
      options?: RetryOptions;
    };
    timeout?: {
      enabled?: boolean;
      options?: TimeoutOptions;
    };
    throttle?: {
      enabled?: boolean;
      options?: ThrottleOptions;
    };
  };
}>;

type ExtractedOptions<T extends CommandContract> = T extends {
  options?: infer O;
}
  ? O
  : never;

type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

type CombinedPartialOptions<
  KnownCommands extends Record<string, CommandContract>
> = Partial<
  UnionToIntersection<ExtractedOptions<KnownCommands[keyof KnownCommands]>>
>;

export class CommandInterceptorManager<
  KnownCommands extends Record<string, CommandContract>
> extends InterceptorManager<
  CommandContract<string, unknown, CombinedPartialOptions<KnownCommands>>
> {
  #props: Required<CommandInterceptorProps>;

  constructor({ cache, strategies }: Partial<CommandInterceptorProps> = {}) {
    super();

    this.#props = {
      cache: cache || new CacheManager(),
      strategies: {
        fallback: {
          enabled: strategies?.fallback?.enabled ?? true,
        },
        retry: {
          enabled: strategies?.retry?.enabled ?? true,
          options: strategies?.retry?.options,
        },
        timeout: {
          enabled: strategies?.timeout?.enabled ?? true,
          options: strategies?.timeout?.options,
        },
        throttle: {
          enabled: strategies?.throttle?.enabled ?? true,
          options: strategies?.throttle?.options,
        },
      },
    };
    this.#setup();

    this.use = this.use.bind(this);
    this.tap = this.tap.bind(this);
    this.execute = this.execute.bind(this);
  }

  #setup() {
    if (this.#props?.strategies?.fallback?.enabled) {
      this.#setupFallbackInterceptor();
    }

    if (this.#props?.strategies?.retry?.enabled) {
      this.#setupRetryInterceptor();
    }

    if (this.#props?.strategies?.timeout?.enabled) {
      this.#setupTimeoutInterceptor();
    }

    if (this.#props?.strategies?.throttle?.enabled) {
      this.#setupThrottleInterceptor();
    }
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
        const strategy = new RetryStrategy(
          command.options?.retry ?? this.#props?.strategies?.retry?.options
        );

        return strategy.execute(command, async (request) => next?.(request));
      }
    );
  }

  #setupTimeoutInterceptor() {
    this.tap(
      (command) => Boolean(command.options?.timeout),
      async (command, next) => {
        const strategy = new TimeoutStrategy({
          timeout:
            command.options?.timeout ??
            this.#props?.strategies?.timeout?.options?.timeout,
        });

        return strategy.execute(command, async (request) => next?.(request));
      }
    );
  }

  #setupThrottleInterceptor() {
    this.tap(
      (command) => Boolean(command.options?.throttle),
      async (command, next) => {
        const strategy = new ThrottleStrategy(this.#props.cache.inMemoryCache, {
          interval:
            command.options?.throttle?.interval ??
            this.#props?.strategies?.throttle?.options?.interval,
          rate:
            command.options?.throttle?.rate ??
            this.#props?.strategies?.throttle?.options?.rate,
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
