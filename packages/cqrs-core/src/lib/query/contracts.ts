import type { InterceptorManagerContract } from '../internal/interceptor/contracts';
import type { CombinedPartialOptions } from '../types';
import type { QueryContext, QueryOptions } from './types';

/**
 * Query contract is used to define a query.
 *
 * Queries are related to the "read" operations.
 *
 * @template TName - The name of the query, typically a string literal.
 * @template TPayload - The optional payload data associated with the query.
 * @template TOptions - The optional options for the query, extending {@link QueryOptions}.
 * @example
 * ```ts
 * import type { QueryContract } from '@stoik/cqrs-core';
 *
 * type GetUserQuery = QueryContract<'user.get', { id: number; }>;
 * ```
 */
export interface QueryContract<
  TName extends string = string,
  TPayload = unknown,
  TOptions = unknown
> {
  /**
   * The unique name of the query.
   */
  queryName: TName;

  /**
   * The optional payload data associated with the query.
   */
  payload?: TPayload;

  /**
   * The optional options for the query, extending {@link QueryOptions}.
   * Options are used to configure cross-cutting concerns like caching, retries, etc.
   */
  options?: TOptions & QueryOptions & Record<string, unknown>;

  /**
   * The query context.
   *
   * @see {@link QueryContext}
   */
  context?: QueryContext;
}

/**
 * Query handler contract.
 *
 * Responsible for executing a specific query.
 *
 * @template TQuery - The type of query the handler accepts, extending {@link QueryContract}.
 * @template TReturn - The return type of the query execution.
 * @example
 * ```ts
 * import type { QueryContract, QueryHandlerContract } from '@stoik/cqrs-core';
 *
 * type User = { id: number; name: string; };
 *
 * type GetUserQuery = QueryContract<'user.get', { id: number; }>;
 * type GetUsersQuery = QueryContract<'users.get', never>;
 *
 * class GetUserQueryHandler implements QueryHandlerContract<GetUserQuery> {
 *   async execute(query: GetUserQuery): Promise<User> {
 *     return { id: query.payload.id, name: 'John Doe' };
 *   }
 * }
 *
 * const getUsersHandler: QueryHandlerContract<GetUsersQuery> = {
 *  async execute(query): Promise<User[]> {
 *   return [{ id: 1, name: 'John Doe' }];
 * }
 * ```
 */
export interface QueryHandlerContract<
  TQuery extends QueryContract = QueryContract,
  TResponse = unknown
> {
  /**
   * Execute the query.
   *
   * @param query - The query to execute.
   * @returns The response of the query execution.
   */
  execute(query: TQuery): Promise<TResponse>;
}

/**
 * Query bus contract.
 *
 * @remarks
 * Query bus is the central hub for registering and executing queries, facilitating cross-cutting concerns through interceptors.
 *
 * @template KnownQueries - The map of known queries, where the key is the query name and the value is the query contract.
 * @example
 * ```ts
 * import { type QueryContract, QueryBus } from '@stoik/cqrs-core';
 *
 * type User = { id: number; name: string; };
 * type GetUserQuery = QueryContract<'user.get', { id: number; }>;
 * type GetUsersQuery = QueryContract<'users.get', never>;
 *
 * type KnownQueries = {
 * 'user.get': GetUserQuery;
 * 'users.get': GetUsersQuery;
 * };
 *
 * const bus = new QueryBus<KnownQueries>();
 *
 * bus.register<GetUserQuery>('user.get', async (query) => {
 *  return { id: query.payload.id, name: 'John Doe' };
 * });
 *
 * bus.register('users.get', async () => {
 *  return [{ id: 1, name: 'John Doe' }];
 * });
 *
 * const user = await bus.dispatch<GetUserQuery, User>({ queryName: 'user.get', payload: { id: 1 } });
 *
 * const users = await bus.dispatch<GetUsersQuery, User[]>({ queryName: 'users.get' });
 * ```
 */
export interface QueryBusContract<
  KnownQueries extends Record<string, QueryContract>
> {
  /**
   * The interceptors manager responsible for applying cross-cutting concerns to the query execution.
   *
   * @see {@link InterceptorManagerContract}
   */
  interceptors: InterceptorManagerContract<
    QueryContract<
      string,
      unknown,
      CombinedPartialOptions<QueryContract, KnownQueries>
    >
  >;

  /**
   * Executes a query using the query bus's interceptor pipeline.
   *
   * @param query - The query to execute.
   * @param handler - The handler to execute the query.
   * @returns The response of the query execution.
   */
  execute<TQuery extends KnownQueries[keyof KnownQueries], TResponse = void>(
    query: TQuery,
    handler: QueryHandlerContract<QueryContract, TResponse>['execute']
  ): Promise<TResponse>;

  /**
   * Registers a query handler to the query bus.
   *
   * @param queryName - The name of the query to register the handler for.
   * @param handler - The handler to execute the query.
   * @returns A function to unregister the handler.
   */
  register<TQuery extends KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['queryName'],
    handler:
      | QueryHandlerContract<TQuery>
      | QueryHandlerContract<TQuery>['execute']
  ): VoidFunction;

  /**
   * Unregisters a query handler from the query bus.
   *
   * @param queryName - The name of the query to unregister the handler for.
   * @param handler - The handler to unregister.
   */
  unregister<TQuery extends KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['queryName'],
    handler:
      | QueryHandlerContract<TQuery>
      | QueryHandlerContract<TQuery>['execute']
  ): void;

  /**
   * Dispatches a query to the query bus for execution.
   *
   * @param query - The query to execute.
   * @returns The response of the query execution.
   */
  dispatch<TQuery extends KnownQueries[keyof KnownQueries], TResponse = void>(
    query: TQuery
  ): Promise<TResponse>;
}
