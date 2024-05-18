import type { OptionsContainer } from './options/options';
import type { ResilienceOptions } from './options/resilience_options';

/**
 * Represents a query definition.
 */
export interface Query<
  Name extends string = string,
  Payload = unknown,
  Options = unknown
> extends OptionsContainer<Options & ResilienceOptions> {
  queryName: Name;
  payload?: Payload;
  context?: QueryContext;
}

/**
 * Represents a query handler definition.
 */
export interface QueryHandler<
  QueryType extends Query = Query,
  ResponseType = unknown
> {
  execute(query: QueryType): Promise<ResponseType>;
}

/**
 * Function type representing a query handler.
 */
export type QueryHandlerFunction<
  QueryType extends Query = Query,
  ResponseType = unknown
> = QueryHandler<QueryType, ResponseType>['execute'];

/**
 * Type representing either a query handler or a query handler function.
 */
export type QueryHandlerOrFunction<
  QueryType extends Query = Query,
  ResponseType = unknown
> =
  | QueryHandler<QueryType, ResponseType>
  | QueryHandlerFunction<QueryType, ResponseType>;

/**
 * Represents the context for a query, primarily used for cancellation.
 */
export interface QueryContext {
  /**
   * The signal for aborting the query.
   *
   * @remarks Integrates with libraries like `@tanstack/react-query` for cancellation mechanisms.
   */
  signal?: AbortSignal;
}

/**
 * Extracts the request type for a specific query name.
 */
export type ExtractQueryRequest<
  QueryName,
  Queries extends QueryRegistry = QueryRegistry
> = Extract<
  Queries[keyof Queries],
  { query: { queryName: QueryName } }
>['query'];

/**
 * Extracts the response type for a specific query name.
 */
export type ExtractQueryResponse<
  QueryName,
  Queries extends QueryRegistry = QueryRegistry
> = Extract<
  Queries[keyof Queries],
  { query: { queryName: QueryName } }
>['response'];

/**
 * Represents a registry of queries.
 */
export interface QueryRegistry {
  [key: string]: QueryEntry;
}

/**
 * Represents an entry in the query registry.
 */
export type QueryEntry = {
  query: Query;
  response: unknown;
};

/**
 * Infers the query handler type for a specific query name.
 */
export type InferredQueryHandler<
  QueryName,
  Queries extends QueryRegistry = QueryRegistry
> = QueryHandlerOrFunction<
  ExtractQueryRequest<QueryName, Queries>,
  ExtractQueryResponse<QueryName, Queries>
>;

/**
 * Extracts the responses for a list of queries.
 */
export type ExtractQueryResponses<Queries extends QueryRegistry> = {
  [Key in keyof Queries]: Queries[Key] extends { response: infer ResponseType }
    ? ResponseType
    : never;
};

/**
 * Extracts the query definitions for a list of queries.
 */
export type ExtractQueryDefinitions<Queries extends QueryRegistry> = {
  [Key in keyof Queries]: Queries[Key] extends { query: infer QueryType }
    ? QueryType extends Query<infer Name, infer Payload, infer Options>
      ? Query<Name, Payload, Options>
      : never
    : never;
};

/**
 * Extracts queries from a given type.
 */
export type ExtractQueries<Type> = Type extends { queries: QueryRegistry }
  ? Type['queries']
  : QueryRegistry;
