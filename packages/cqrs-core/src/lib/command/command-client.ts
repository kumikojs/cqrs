import { CacheManager } from '../internal/cache/cache-manager';
import { BulkheadStrategy } from '../strategy/bulkhead-strategy';
import { ThrottleStrategy } from '../strategy/throttle-strategy';
import { CommandBus, CommandBusContract } from './command-bus';

const timeoutStrategy = () => import('../strategy/timeout-strategy');
const retryStrategy = () => import('../strategy/retry-strategy');
const fallbackStrategy = () => import('../strategy/fallback-strategy');

export class CommandClient {
  #commandBus: CommandBusContract;
  #bulkheadStrategy: BulkheadStrategy;
  #cacheManager: CacheManager;

  constructor({
    commandBus = new CommandBus(),
    cacheManaher = new CacheManager(),
    bulkheadStrategy = new BulkheadStrategy(),
  } = {}) {
    this.#commandBus = commandBus;
    this.#cacheManager = cacheManaher;
    this.#bulkheadStrategy = bulkheadStrategy;

    this.#bootstrap();
  }

  get commandBus() {
    return this.#commandBus;
  }

  #bootstrap() {
    this.#commandBus.interceptors.apply(async (command, next) => {
      if (command?.options?.fallback) {
        const module = await fallbackStrategy();
        const strategy = new module.FallbackStrategy({
          fallback: command.options.fallback,
        });

        return strategy.execute(command, async (request) => next?.(request));
      }

      return next?.(command);
    });

    this.#commandBus.interceptors
      .select((command) => Boolean(command.options?.retry))
      .apply(async (command, next) => {
        const module = await retryStrategy();
        const strategy = new module.RetryStrategy(command.options?.retry);

        return strategy.execute(command, async (request) => next?.(request));
      });

    this.#commandBus.interceptors
      .select((command) => Boolean(command.options?.timeout))
      .apply(async (command, next) => {
        const module = await timeoutStrategy();
        const strategy = new module.TimeoutStrategy({
          timeout: command.options?.timeout,
        });

        return strategy.execute(command, async (request) => next?.(request));
      });

    this.#commandBus.interceptors
      .select((command) => Boolean(command.options?.bulkhead))
      .apply(async (command, next) => {
        return this.#bulkheadStrategy.execute(command, async (request) =>
          next?.(request)
        );
      });

    this.#commandBus.interceptors
      .select((command) => Boolean(command.options?.throttle))
      .apply(async (command, next) => {
        const strategy = new ThrottleStrategy(
          this.#cacheManager.inMemoryCache,
          command.options?.throttle
        );

        return strategy.execute(command, async (request) => next?.(request));
      });
  }
}
