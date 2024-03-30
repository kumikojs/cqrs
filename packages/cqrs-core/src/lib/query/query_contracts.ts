import type { QueryContext, QueryOptions } from './query_types';

/**
 * Interface defining the structure of a query within the application domain.
 * Queries represent operations that retrieve data or information.
 *
 * @template TName - The unique name of the query, typically a string literal.
 * @template TPayload - The optional payload data associated with the query, providing additional context or search criteria.
 * @template TOptions - The optional configuration options for the query, extending the {@link QueryOptions} interface.
 * @example
 * ```typescript
 * import type { QueryContract } from '@stoik/cqrs-core';
 *
 * type GetUserQuery = QueryContract<'user.get', { id: number; }>;
 *
 * // Usage example with options
 * const getUserWithCache = {
 *  queryName: 'user.get',
 *  payload: { id: 1 },
 *  options: { cache: { ttl: '5s', persist: false } }, // Cache the result in memory for 5 seconds
 * };
 * ```
 */
export interface QueryContract<
  TName extends string = string,
  TPayload = unknown,
  TOptions = unknown
> {
  /**
   * The unique name of the query that serves as an identifier.
   */
  queryName: TName;

  /**
   * The optional payload data associated with the query, potentially containing details for the retrieval operation.
   */
  payload?: TPayload;

  /**
   * The optional options for the query execution, extending the {@link QueryOptions} interface.
   * Options are used to configure cross-cutting concerns like caching, retries, timeouts, etc.
   */
  options?: TOptions & QueryOptions & Record<string, unknown>;

  /**
   * The optional query context object, potentially containing additional information relevant to query execution.
   * (Refer to the {@link QueryContext} type for details.)
   */
  context?: QueryContext;
}

/**
 * Interface defining the contract for a query handler function or class.
 * Represents a function or class responsible for executing a specific query type.
 *
 * @template TQuery - The type of query the handler accepts, extending the {@link QueryContract} interface.
 * @template TResponse - The return type of the query execution, representing the retrieved data or information.
 * @example
 * ```typescript
 * import type { QueryContract, QueryHandlerContract } from '@stoik/cqrs-core';
 *
 * type User = { id: number; name: string; };
 *
 * type GetUserQuery = QueryContract<'user.get', { id: number; }>;
 * type GetUsersQuery = QueryContract<'users.get', never>;
 *
 * // Function-based handler
 * const getUsersHandler: QueryHandlerContract<GetUsersQuery> = {
 *  async execute(query): Promise<User[]> {
 *   return [{ id: 1, name: 'John Doe' }];
 * }
 *
 * // Class-based handler
 * class GetUserQueryHandler implements QueryHandlerContract<GetUserQuery> {
 *   async execute(query: GetUserQuery): Promise<User> {
 *     return { id: query.payload.id, name: 'John Doe' };
 *   }
 * }
 * ```
 */
export interface QueryHandlerContract<
  TQuery extends QueryContract = QueryContract,
  TResponse = unknown
> {
  /**
   * Executes the given query and returns the response.
   *
   * @param query - The query to be executed.
   * @returns A promise resolving to the response data or information retrieved by the query execution.
   */
  execute(query: TQuery): Promise<TResponse>;
}
