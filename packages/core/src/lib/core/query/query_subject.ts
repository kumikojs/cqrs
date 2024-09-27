/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from '../../client';
import { Operation } from '../../utilities/reactive/operation';
import { SubscriptionManager } from '../../utilities/subscription/subscription_manager';

import { ResilienceOptions } from '../../types/core/options/resilience_options';
import type {
  Query,
  QueryProcessorFunction,
  QueryHandler,
  QueryInput,
  QueryResult,
} from '../../types/core/query';

/**
 * **QuerySubject Class**
 *
 * A facade for executing queries, subscribing to their state changes, and managing cache invalidation.
 * This class simplifies UI component interaction with queries by providing a centralized mechanism for:
 * - Execution: Triggering query execution.
 * - State Management: Tracking the current state of the query execution (loading, success, error).
 * - Automatic Re-execution: Re-executing the query upon cache invalidation.
 *
 * **Benefits:**
 * - Simplifies UI development by offering a reactive and user-friendly experience for query interaction.
 * - Encapsulates the underlying `Operation` class for state management.
 * - Provides automatic re-execution logic when the query's cache entry becomes invalidated.
 *
 * @remarks
 * This class is designed for UI components to interact with queries. It abstracts away complex details
 * of query execution and cache management, allowing developers to focus on rendering data and handling state changes.
 */
export class QuerySubject<
  TRequest extends QueryInput<string, unknown, ResilienceOptions>,
  TResult extends QueryResult
> {
  /**
   * @private
   * The internal `Operation` instance responsible for handling query execution and state management.
   */
  #operation: Operation<TResult>;

  /**
   * @private
   * Stores details of the most recently executed query, used for re-execution upon cache invalidation.
   */
  #lastQuery: TRequest;

  /**
   * @private
   * The handler function used for executing the query.
   */
  #handlerFn: QueryProcessorFunction<TRequest, TResult>;

  /**
   * @private
   * The client instance, used for interacting with the cache.
   */
  #client: Client;

  #subscriptionManager: SubscriptionManager = new SubscriptionManager();

  /**
   * Creates a new instance of `QuerySubject`.
   *
   * @param query - The query to be represented and managed.
   * @param client - The client instance for interacting with the cache.
   * @param handler - An optional custom handler for executing the query.
   *                     If not provided, the default query dispatching mechanism is used.
   */
  constructor(
    query: TRequest,
    client: Client,
    handler?: QueryHandler<TRequest, TResult>
  ) {
    this.#operation = new Operation<TResult>();
    this.#client = client;
    this.#lastQuery = query;
    this.#handlerFn = handler
      ? (query) =>
          client.query.execute<Query<TRequest, TResult>>(
            query,
            typeof handler === 'function' ? handler : handler.execute
          )
      : (query) => client.query.dispatch<Query<TRequest, TResult>>(query);
  }

  /**
   * Executes the query, manages its state, and handles cache invalidation.
   *
   * @param query - The query to be executed.
   * @returns A promise resolving to the query's result.
   */
  async execute(query: TRequest): Promise<TResult> {
    this.#lastQuery = query;

    return this.#operation.execute<TRequest, TResult>(query, this.#handlerFn);
  }

  /**
   * Subscribes to state changes of the query's execution.
   *
   * @param onStateChange - A callback function to be invoked whenever the query's state changes.
   * @returns A function to unsubscribe from both state change notifications and cache invalidation events.
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

  /**
   * Retrieves the current state of the query's execution.
   *
   * @returns The current state of the query.
   */
  get state() {
    return this.#operation.state;
  }

  /**
   * @private
   * Subscribes to cache invalidation events for the query.
   */
  #onCacheInvalidation() {
    return this.#client.cache.on('invalidated', (key: string) => {
      if (key !== this.#client.cache.getCacheKey(this.#lastQuery)) return;

      this.execute({
        ...this.#lastQuery,
        options: {
          ...this.#lastQuery.options,
          cache: {
            ...(typeof this.#lastQuery.options?.cache === 'boolean'
              ? {}
              : this.#lastQuery.options?.cache),
            invalidate: true,
          },
        },
      });
    });
  }

  /**
   * @private
   * Subscribes to optimistic update events for the query.
   */
  #onOptimisticUpdate() {
    const optimisticUpdateBegan = this.#client.cache.on(
      'optimistic_update_began',
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
      'optimistic_update_ended',
      async (key) => {
        if (key !== this.#client.cache.getCacheKey(this.#lastQuery)) return;

        const result = await this.#client.cache.get<TResult>(this.#lastQuery);

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
