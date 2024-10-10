import { KumikoLogger } from '../../utilities/logger/kumiko_logger';
import { QueryCache } from '../query/query_cache';

import type { CommandCacheContract } from '../../types/core/command';
import type { Query, QueryRegistry } from '../../types/core/query';

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
export class CommandCache<KnownQueries extends QueryRegistry = QueryRegistry>
  implements CommandCacheContract<KnownQueries>
{
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
   * Optimistically updates a query and handles rollback in case of failure.
   *
   * @template TQuery - The type of the query to update.
   * @param queryOrName - The query or query name to update.
   * @param updater - The function to generate the new response based on the previous result.
   */
  async optimisticUpdate<TQuery extends Query>(
    queryOrName: TQuery['req'] | TQuery['req']['queryName'],
    updater: (prev: TQuery['res'] | null | undefined) => TQuery['res']
  ): Promise<void> {
    const query =
      typeof queryOrName === 'string'
        ? { queryName: queryOrName }
        : queryOrName;

    this.#logger.trace('Updating query', { query });

    const prevData = await this.#cache.get<TQuery['res']>(query);
    const nextData = updater(prevData);

    await this.#attemptUpdate(query, nextData, prevData);
    await this.#handlePromiseAndInvalidate(query);
  }

  /**
   * Attempts to optimistically update the query and handles rollback on failure.
   */
  async #attemptUpdate<TQuery extends Query>(
    query: TQuery['req'],
    nextData: TQuery['res'],
    prevData: TQuery['res'] | null | undefined
  ): Promise<void> {
    try {
      await this.#cache.optimisticUpdate(query, nextData);
    } catch (error) {
      this.#logger.error('Failed to update query', { query });
      await this.#attemptRollback(query, prevData);
    }
  }

  /**
   * Attempts to roll back the query to its previous state.
   */
  async #attemptRollback<TQuery extends Query>(
    query: TQuery['req'],
    prevData: TQuery['res'] | null | undefined
  ): Promise<void> {
    try {
      await this.#cache.optimisticUpdate(query, prevData);
    } catch (rollbackError) {
      this.#logger.error('Failed to rollback query update', { query });
    }
  }

  /**
   * Handles the optional promise and invalidates queries when the promise resolves.
   */
  async #handlePromiseAndInvalidate<TQuery extends Query>(
    query: TQuery['req']
  ): Promise<void> {
    if (this.#promise) {
      try {
        await this.#promise;
        this.#logger.trace('Promise resolved, invalidating queries');
        this.#cache.invalidateQueries(query);
      } catch (error) {
        this.#logger.error('Promise failed, skipping cache invalidation', {
          query,
        });
      }
    } else {
      this.#logger.trace(
        'No promise provided, invalidating queries immediately'
      );
      this.#cache.invalidateQueries(query);
    }
  }
}
