/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from '../client';
import { Operation } from '../internal/operation/operation';

import type { VoidFunction } from '../types';
import type { QueryContract, QueryHandlerContract } from './contracts';

/**
 * A facade for executing queries, subscribing to their state changes, and handling cache invalidation.
 * Designed for UI components to interact with queries, providing a centralized mechanism for execution, state management, and automatic re-execution upon cache invalidation.
 *
 * @remarks
 * This class simplifies UI development by offering a reactive and user-friendly experience for query interaction. It encapsulates the underlying `Operation` class for state management and provides automatic re-execution logic when the query's cache entry becomes invalidated.
 */
export class QuerySubject<TRequest extends QueryContract, TResult> {
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
  #handlerFn: QueryHandlerContract<TRequest, TResult>['execute'];

  /**
   * @private
   * The client instance, used for interacting with the cache.
   */
  #client: Client;

  /**
   * @private
   * The unsubscribe function for the cache invalidation subscription.
   */
  #cacheSubscription: VoidFunction;

  /**
   * Creates a new instance of `QuerySubject`.
   *
   * @param query - The query to be represented and managed.
   * @param client - The client instance for interacting with the cache.
   * @param handlerFn - An optional custom handler function for executing the query.
   *                     If not provided, the default query dispatching mechanism is used.
   */
  constructor(
    query: TRequest,
    client: Client,
    handlerFn?: QueryHandlerContract<TRequest, TResult>['execute']
  ) {
    this.#operation = new Operation<TResult>();
    this.#client = client;
    this.#lastQuery = query;
    this.#handlerFn = handlerFn
      ? (query) => client.query.execute(query, handlerFn)
      : (query) => client.query.dispatch(query);

    this.#cacheSubscription = this.#client.cache.onInvalidate(
      this.#lastQuery.queryName,
      () => {
        this.execute({
          ...this.#lastQuery,
          options: {
            ...this.#lastQuery.options,
            cache: {
              invalidate: true,
              ...(typeof this.#lastQuery.options?.cache === 'boolean'
                ? {}
                : this.#lastQuery.options?.cache),
            },
          },
        });
      }
    );
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
    const subscription = this.#operation.subscribe(onStateChange);

    return () => {
      subscription();
      this.#cacheSubscription();
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
}
