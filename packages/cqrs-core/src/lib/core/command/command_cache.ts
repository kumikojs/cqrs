import { StoikLogger } from '../../utilities/logger/stoik_logger';
import { QueryCache } from '../query/query_cache';

import type { Query, QueryRegistry } from '../../types/core/query';

/**
 * Options for configuring the CommandCache.
 */
type CommandCacheOptions = {
  cache: QueryCache;
  logger: StoikLogger;
};

/**
 * A cache utility for managing command-related queries and their state.
 *
 * @template KnownQueries - The known queries in the system, extending {@link QueryRegistry}.
 */
export class CommandCache<KnownQueries extends QueryRegistry = QueryRegistry> {
  #cache: QueryCache;
  #promise?: Promise<unknown>;
  #logger: StoikLogger;

  /**
   * Constructs a `CommandCache` instance.
   *
   * @param options - The cache and logger options.
   * @param promise - An optional promise to be resolved before invalidating queries.
   */
  constructor(options: CommandCacheOptions, promise?: Promise<unknown>) {
    this.#cache = options.cache;
    this.#logger = options.logger.child({ topics: ['cache', 'command'] });
    this.#promise = promise;
  }

  /**
   * Invalidates the specified queries in the cache.
   *
   * @param queries - The queries to invalidate.
   */
  invalidateQueries(
    ...queries: (
      | KnownQueries[keyof KnownQueries]['query']['queryName']
      | KnownQueries[keyof KnownQueries]['query']
    )[]
  ) {
    this.#cache.invalidateQueries(...queries);
  }

  /**
   * Updates the specified query in the cache optimistically.
   *
   * @template TQuery - The type of the query to update.
   * @template TResponse - The expected response type of the query.
   * @param query - The query to update.
   * @param updater - The function to generate the new response based on the previous result.
   */
  async update<
    TQuery extends
      | KnownQueries[keyof KnownQueries]['query']
      | KnownQueries[keyof KnownQueries]['query']['queryName'],
    TResponse extends KnownQueries[keyof KnownQueries]['response'] = Extract<
      KnownQueries[keyof KnownQueries],
      {
        query: {
          queryName: TQuery extends Query ? TQuery['queryName'] : TQuery;
        };
      }
    >['response']
  >(
    query: TQuery,
    updater: (previousResult: TResponse | null | undefined) => TResponse
  ): Promise<void> {
    const queryContract: Query = (query as Query).queryName
      ? (query as Query)
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
  }
}
