import { StoikLogger } from '../logger/stoik_logger';
import { QueryCache } from '../query/query_cache';

import type { QueryContract } from '../query/query_contracts';
import type { BaseQueries } from '../query/query_types';

type CommandCacheOptions = {
  cache: QueryCache;
  logger: StoikLogger;
};

export class CommandCache<KnownQueries extends BaseQueries = BaseQueries> {
  #cache: QueryCache;
  #promise?: Promise<unknown>;
  #logger: StoikLogger;

  constructor(options: CommandCacheOptions, promise?: Promise<unknown>) {
    this.#cache = options.cache;
    this.#logger = options.logger.child({ topics: ['cache', 'command'] });
    this.#promise = promise;
  }

  invalidateQueries = (
    ...queries: (
      | KnownQueries[keyof KnownQueries]['query']['queryName']
      | KnownQueries[keyof KnownQueries]['query']
    )[]
  ) => {
    this.#cache.invalidateQueries(...queries);
  };

  update = async <
    TQuery extends
      | KnownQueries[keyof KnownQueries]['query']
      | KnownQueries[keyof KnownQueries]['query']['queryName'],
    TResponse extends KnownQueries[keyof KnownQueries]['response'] = Extract<
      KnownQueries[keyof KnownQueries],
      {
        query: {
          queryName: TQuery extends QueryContract
            ? TQuery['queryName']
            : TQuery;
        };
      }
    >['response']
  >(
    query: TQuery,
    updater: (previousResult: TResponse | null | undefined) => TResponse
  ) => {
    const queryContract: QueryContract = (query as QueryContract).queryName
      ? (query as QueryContract)
      : { queryName: query as string };
    this.#logger.trace('Updating query', { query: queryContract });

    const prevData = await this.#cache.get<TResponse>(queryContract);

    const nextData = updater(prevData);

    try {
      await this.#cache.optimisticUpdate(queryContract, nextData);
    } catch (error) {
      this.#logger.error('Failed to update query', { query: queryContract });
      await this.#cache.optimisticUpdate(queryContract, prevData);
    }

    this.#promise?.then(() => {
      this.#cache.invalidateQueries(query);
    });
  };
}
