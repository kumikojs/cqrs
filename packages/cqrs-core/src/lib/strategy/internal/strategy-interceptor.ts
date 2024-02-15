/* eslint-disable @typescript-eslint/no-explicit-any */
import { InterceptorContract } from '../../internal/interceptor/interceptor';
import { Strategy } from './strategy';

export interface StrategyInterceptorContract {
  handle<TRequest>(
    request: TRequest,
    next: (request: TRequest) => Promise<any>
  ): Promise<any>;
}

export class StrategyInterceptor<TOptions> implements InterceptorContract<any> {
  #strategy: Strategy<TOptions>;

  constructor(strategy: Strategy<TOptions>) {
    this.#strategy = strategy;
  }

  async handle<TRequest>(
    request: TRequest,
    next: (request: TRequest) => Promise<any>
  ) {
    return await this.#strategy.execute(request, next);
  }
}
