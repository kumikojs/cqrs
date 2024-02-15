import { BulkheadStrategy } from '../strategy/bulkhead-strategy';
import {
  StrategyInterceptor,
  StrategyInterceptorContract,
} from '../strategy/internal/strategy-interceptor';
import { ThrottleStrategy } from '../strategy/throttle-strategy';
import { CommandBus, CommandBusContract } from './command-bus';

const timeoutStrategy = () => import('../strategy/timeout-strategy');
const retryStrategy = () => import('../strategy/retry-strategy');
const fallbackStrategy = () => import('../strategy/fallback-strategy');

export class CommandClient {
  #commandBus: CommandBusContract;
  #bulkheadInterceptor: StrategyInterceptorContract;

  constructor({
    commandBus = new CommandBus(),
    bulkheadInterceptor = new StrategyInterceptor(new BulkheadStrategy()),
  } = {}) {
    this.#commandBus = commandBus;

    this.#bulkheadInterceptor = bulkheadInterceptor;
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
        return new StrategyInterceptor(strategy).handle(
          command,
          async (request) => next?.(request)
        );
      }

      return next?.(command);
    });

    this.#commandBus.interceptors
      .select((command) => Boolean(command.options?.retry))
      .apply(async (command, next) => {
        const module = await retryStrategy();
        const strategy = new module.RetryStrategy(command.options?.retry);
        return new StrategyInterceptor(strategy).handle(
          command,
          async (request) => next?.(request)
        );
      });

    this.#commandBus.interceptors
      .select((command) => Boolean(command.options?.timeout))
      .apply(async (command, next) => {
        const module = await timeoutStrategy();
        const strategy = new module.TimeoutStrategy({
          timeout: command.options?.timeout,
        });
        return new StrategyInterceptor(strategy).handle(
          command,
          async (request) => next?.(request)
        );
      });

    this.#commandBus.interceptors
      .select((command) => Boolean(command.options?.bulkhead))
      .apply(async (command, next) => {
        return this.#bulkheadInterceptor.handle(command, async (request) =>
          next?.(request)
        );
      });

    this.#commandBus.interceptors
      .select((command) => Boolean(command.options?.throttle))
      .apply(async (command, next) => {
        const throttle = new ThrottleStrategy(command.options?.throttle);
        return new StrategyInterceptor(throttle).handle(
          command,
          async (request) => next?.(request)
        );
      });
  }
}
