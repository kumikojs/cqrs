import {
  InterceptorManager,
  type InterceptorManagerContract,
} from '../../internal/interceptor/interceptor-manager';
import type { QueryContract } from '../query';
import type { QueryHandlerContract } from '../query-handler';
import type { QueryInterceptor } from '../query-interceptor';

export type SelectThenApplySyntax<TQuery extends QueryContract> = {
  apply: (interceptor: QueryInterceptor<TQuery>) => void;
};

export interface QueryInterceptorManagerContract {
  apply<TQuery extends QueryContract>(
    interceptor: QueryInterceptor<TQuery>
  ): void;

  select<TQuery extends QueryContract>(
    selector: (query: TQuery) => boolean
  ): SelectThenApplySyntax<TQuery>;

  execute<TQuery extends QueryContract, TResponse>(
    query: TQuery,
    handler: QueryHandlerContract<TQuery, TResponse>['execute']
  ): Promise<TResponse>;
}

export class QueryInterceptorManager
  implements QueryInterceptorManagerContract
{
  #interceptorManager: InterceptorManagerContract<QueryContract>;

  constructor(
    interceptorManager: InterceptorManagerContract<QueryContract> = new InterceptorManager()
  ) {
    this.#interceptorManager = interceptorManager;
  }

  select<TQuery extends QueryContract>(
    selector: (query: TQuery) => boolean
  ): SelectThenApplySyntax<TQuery> {
    return {
      apply: (interceptor: QueryInterceptor<TQuery>) => {
        this.#interceptorManager.use<TQuery>(async (query, next) => {
          if (selector(query)) {
            return interceptor(query, next);
          }

          return next?.(query);
        });
      },
    };
  }

  apply<TQuery extends QueryContract>(
    interceptor: QueryInterceptor<TQuery>
  ): void {
    this.#interceptorManager.use(interceptor);
  }

  async execute<TQuery extends QueryContract, TResponse>(
    query: TQuery,
    handler: QueryHandlerContract<TQuery, TResponse>['execute']
  ): Promise<TResponse> {
    return this.#interceptorManager.execute(query, handler);
  }
}
