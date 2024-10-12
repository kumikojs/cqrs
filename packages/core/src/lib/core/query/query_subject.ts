/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from '../../client';
import { CACHE_EVENT_TYPES } from '../../infrastructure/cache/cache';
import { Operation } from '../../utilities/reactive/operation';
import { SubscriptionManager } from '../../utilities/subscription/subscription_manager';

import type { ResilienceOptions } from '../../types/core/options/resilience_options';
import type {
  Query,
  QueryHandler,
  QueryInput,
  QueryProcessorFunction,
} from '../../types/core/query';

/*
 * ---------------------------------------------------------------------------
 * **QuerySubject Class**
 * ---------------------------------------------------------------------------
 * A facade for executing queries, subscribing to their state changes, and
 * managing cache invalidation. The `QuerySubject` class simplifies UI
 * component interaction with queries by providing a centralized mechanism
 * for:
 *
 * - **Execution**: Triggering query execution.
 * - **State Management**: Tracking the current state of the query
 *   execution (loading, success, error).
 * - **Automatic Re-execution**: Re-executing the query upon cache
 *   invalidation.
 *
 * The `QuerySubject` class abstracts away complex details of query execution
 * and cache management, allowing to focus on rendering data and
 * handling state changes.
 *
 * **Key Benefits:**
 * - Simplifies UI development by offering a reactive and user-friendly
 *   experience for query interaction.
 * - Encapsulates the underlying `Operation` class for state management.
 * - Provides automatic re-execution logic when the query's cache entry
 *   becomes invalidated.
 *
 * ---------------------------------------------------------------------------
 */
export class QuerySubject<
  TRequest extends Query<QueryInput<string, unknown, ResilienceOptions>>
> {
  #operation: Operation<TRequest['res']>;
  #lastQuery: TRequest['req'];
  #handlerFn: QueryProcessorFunction<TRequest>;
  #client: Client;
  #subscriptionManager: SubscriptionManager = new SubscriptionManager();

  constructor(
    query: TRequest['req'],
    client: Client<any, any>,
    handler?: QueryHandler<TRequest>
  ) {
    this.#operation = new Operation<TRequest['res']>();
    this.#client = client;
    this.#lastQuery = query;
    this.#handlerFn = handler
      ? (query) =>
          client.query.execute<TRequest>(
            query,
            typeof handler === 'function' ? handler : handler.execute
          )
      : (query) => client.query.dispatch<TRequest>(query);
  }

  /*
   * ---------------------------------------------------------------------------
   * Public Methods
   * ---------------------------------------------------------------------------
   */
  get state() {
    return this.#operation.state;
  }

  /**
   * Executes the query and updates the query state.
   */
  async execute(query: TRequest['req']) {
    this.#lastQuery = query;

    return this.#operation.execute<TRequest['req'], TRequest['res']>(
      query,
      this.#handlerFn
    );
  }

  /**
   * Subscribes to query state changes and cache invalidation events.
   */
  subscribe(onStateChange: VoidFunction): VoidFunction {
    this.#subscriptionManager
      .subscribe(this.#operation.subscribe(onStateChange))
      .subscribe(this.#onCacheInvalidation())
      .subscribe(this.#onOptimisticUpdate());

    return () => {
      this.#subscriptionManager.disconnect();
    };
  }

  /*
   * ---------------------------------------------------------------------------
   * Private Methods
   * ---------------------------------------------------------------------------
   */

  /**
   * Subscribes to cache invalidation events and re-executes the query
   */
  #onCacheInvalidation() {
    return this.#client.cache.on(
      CACHE_EVENT_TYPES.INVALIDATED,
      (key: string) => {
        if (key !== this.#client.cache.getCacheKey(this.#lastQuery)) return;
        this.execute({
          ...this.#lastQuery,
          options: {
            cache: {
              ...(typeof this.#lastQuery.options?.cache === 'boolean'
                ? {}
                : this.#lastQuery.options?.cache),
              invalidate: true,
            },
          },
        });
      }
    );
  }

  /**
   * Subscribes to optimistic update events and updates the query state
   */
  #onOptimisticUpdate() {
    const optimisticUpdateBegan = this.#client.cache.on(
      CACHE_EVENT_TYPES.OPTIMISTIC_UPDATE_BEGAN,
      (key) => {
        if (key !== this.#client.cache.getCacheKey(this.#lastQuery)) return;

        /**
         * Before updating the cache, we need to cancel the query to
         * prevent the cache from being updated with stale data.
         */
        this.#client.query.cancelQuery(this.#lastQuery.queryName);
      }
    );

    const optimisticUpdateEnded = this.#client.cache.on(
      CACHE_EVENT_TYPES.OPTIMISTIC_UPDATE_ENDED,
      async (key) => {
        if (key !== this.#client.cache.getCacheKey(this.#lastQuery)) return;

        const result = await this.#client.cache.get<TRequest['res']>(
          this.#lastQuery
        );

        if (result) {
          this.#operation.stale(result);
        }
      }
    );

    return () => {
      optimisticUpdateBegan();
      optimisticUpdateEnded();
    };
  }
}
