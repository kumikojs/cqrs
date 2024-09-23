import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { QueryCache } from '../query/query_cache';

import type { QueryRegistry, QueryRequest } from '../../types/core/query';

/**
 * Options for configuring the CommandCache.
 */
type CommandCacheOptions = {
  cache: QueryCache;
  logger: KumikoLogger;
};

/**
 * A cache utility for managing command-related queries and their state.
 *
 * @template KnownQueries - The known queries in the system, extending {@link QueryRegistry}.
 */
export class CommandCache<KnownQueries extends QueryRegistry = QueryRegistry> {
  #cache: QueryCache;
  #promise?: Promise<unknown>;
  #logger: KumikoLogger;

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
      | KnownQueries[keyof KnownQueries]['req']['queryName']
      | KnownQueries[keyof KnownQueries]['req']
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
  async optimisticUpdate<
    TQuery extends
      | KnownQueries[keyof KnownQueries]['req']
      | KnownQueries[keyof KnownQueries]['req']['queryName'],
    TResponse extends KnownQueries[keyof KnownQueries]['res'] = Extract<
      KnownQueries[keyof KnownQueries],
      {
        query: {
          queryName: TQuery extends QueryRequest ? TQuery['queryName'] : TQuery;
        };
      }
    >['res']
  >(
    queryOrName: TQuery,
    updater: (previousResult: TResponse | null | undefined) => TResponse
  ): Promise<void> {
    const query: QueryRequest = (queryOrName as QueryRequest).queryName
      ? (queryOrName as QueryRequest)
      : { queryName: queryOrName as string };
    this.#logger.trace('Updating query', { query });

    const prevData = await this.#cache.get<TResponse>(query);

    const nextData = updater(prevData);

    try {
      await this.#cache.optimisticUpdate(query, nextData);
    } catch (error) {
      this.#logger.error('Failed to update query', { query });
      await this.#cache.optimisticUpdate(query, prevData);
    }

    this.#promise?.then(() => {
      this.#cache.invalidateQueries(query);
    });
  }
}
