import { QueryCache } from '../query/query_cache';
import { QueryContract } from '../query/query_contracts';

import type { BaseQueries } from '../query/query_types';

export class CommandCache<KnownQueries extends BaseQueries = BaseQueries> {
  #cache: QueryCache;
  #promise?: Promise<unknown>;

  constructor(cache: QueryCache, promise?: Promise<unknown>) {
    this.#cache = cache;
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

    const prevData = await this.#cache.get<TResponse>(queryContract);

    const nextData = updater(prevData);

    await this.#cache.optimisticUpdate(queryContract, nextData);

    this.#promise?.then(() => {
      this.#cache.invalidateQueries(query);
    });
  };
}
