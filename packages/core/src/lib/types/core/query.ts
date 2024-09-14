import type { DurationUnit } from '../helpers';
import type {
  AsyncStorageDriver,
  InterceptorManagerContract,
  SyncStorageDriver,
} from '../main';
import type { MergedPartialOptions, OptionsContainer } from './options/options';
import type { ResilienceOptions } from './options/resilience_options';

export interface QueryRequest<
  Name extends string = string,
  Payload = unknown,
  Options = unknown
> extends OptionsContainer<Options & ResilienceOptions> {
  queryName: Name;
  payload?: Payload;
  context?: QueryContext;
}

export type QueryResponse<ResponseType = unknown> = ResponseType;

export type Query<
  ReqType extends QueryRequest = QueryRequest,
  ResType extends QueryResponse = QueryResponse
> = {
  req: ReqType;
  res: ResType;
};

/**
 * Represents a query handler definition.
 */
export interface QueryHandler<
  QueryType extends QueryRequest = QueryRequest,
  ResponseType = unknown
> {
  execute(query: QueryType): Promise<ResponseType>;
}

/**
 * Function type representing a query handler.
 */
export type QueryHandlerFunction<
  QueryType extends QueryRequest = QueryRequest,
  ResponseType = unknown
> = QueryHandler<QueryType, ResponseType>['execute'];

/**
 * Type representing either a query handler or a query handler function.
 */
export type QueryHandlerOrFunction<
  QueryType extends QueryRequest = QueryRequest,
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
  QueryName extends string,
  Queries extends QueryRegistry = QueryRegistry
> = Extract<Queries[keyof Queries], { req: QueryRequest<QueryName> }>['req'];

/**
 * Extracts the response type for a specific query name.
 */
export type ExtractQueryResponse<
  QueryName,
  Queries extends QueryRegistry = QueryRegistry
> = Extract<Queries[keyof Queries], { req: { queryName: QueryName } }>['res'];

/**
 * Represents a registry of queries.
 */
export interface QueryRegistry {
  [key: string]: Query;
}

/**
 * Infers the query handler type for a specific query name.
 */
export type InferredQueryHandler<
  QueryName extends string,
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
  [Key in keyof Queries]: Queries[Key] extends { req: infer QueryType }
    ? QueryType extends QueryRequest<infer Name, infer Payload, infer Options>
      ? QueryRequest<Name, Payload, Options>
      : never
    : never;
};

/**
 * Represents the options for the query cache.
 *
 * @remarks
 * The query cache is used to store the results of queries for a specified duration.
 * The cache is split into two levels: L1 and L2.
 * - The L1 cache is used for fast access to the most recent query results.
 * - The L2 cache is used for long-term storage of query results.
 * The cache is also responsible for invalidating query results when necessary.
 */
export type QueryCacheOptions = {
  l1?: CacheOptions;
  l2: CacheOptions & {
    driver: SyncStorageDriver | AsyncStorageDriver;
  };
};

type CacheOptions = {
  ttl?: DurationUnit;
  gcInterval?: DurationUnit;
};

type ExtractQuery<Queries, QueryName> = QueryName extends keyof Queries
  ? Queries[QueryName]
  : never;

export interface QueryBusContract<
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownQueryDefinitions extends Record<
    string,
    QueryRequest
  > = ExtractQueryDefinitions<KnownQueries>
> {
  execute<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    query: TQuery['req'],
    handler: QueryHandlerFunction<TQuery['req'], TQuery['res']>
  ): Promise<TQuery['res']>;

  dispatch<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    query: TQuery['req']
  ): Promise<TQuery['res']>;

  /*
   * Infers queryName from KnownQueries.
   * Useful when queryName is known and request/response types don't need to be specified.
   */
  register<
    TQueryName extends keyof KnownQueries,
    TQuery extends ExtractQuery<KnownQueries, TQueryName>
  >(
    queryName: TQueryName,
    handler: QueryHandlerOrFunction<TQuery['req'], TQuery['res']>
  ): VoidFunction;

  /*
   * Infers queryName from the query request.
   * Useful when queryName is not known and request/response types need to be specified.
   */
  register<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['req']['queryName'],
    handler: QueryHandlerOrFunction<TQuery['req'], TQuery['res']>
  ): VoidFunction;

  /*
   * Explicitly specify the types of the query request and response.
   */
  register<
    TQueryRequest extends QueryRequest = KnownQueries[keyof KnownQueries]['req'],
    TQueryResponse extends QueryResponse = ExtractQueryResponse<
      TQueryRequest['queryName'],
      KnownQueries
    >
  >(
    queryName: TQueryRequest['queryName'],
    handler: QueryHandlerFunction<TQueryRequest, TQueryResponse>
  ): VoidFunction;

  /*
   * Infers queryName from KnownQueries.
   * Useful when queryName is known and request/response types don't need to be specified.
   */
  unregister<
    TQueryName extends keyof KnownQueries,
    TQuery extends ExtractQuery<KnownQueries, TQueryName>
  >(
    queryName: TQueryName,
    handler: QueryHandlerOrFunction<TQuery['req'], TQuery['res']>
  ): void;

  /*
   * Infers queryName from the query request.
   * Useful when queryName is not known and request/response types need to be specified.
   */
  unregister<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['req']['queryName'],
    handler: QueryHandlerOrFunction<TQuery['req'], TQuery['res']>
  ): void;

  /*
   * Explicitly specify the types of the query request and response.
   */
  unregister<
    TQueryRequest extends QueryRequest = KnownQueries[keyof KnownQueries]['req'],
    TQueryResponse extends QueryResponse = ExtractQueryResponse<
      TQueryRequest['queryName'],
      KnownQueries
    >
  >(
    queryName: TQueryRequest['queryName'],
    handler: QueryHandlerFunction<TQueryRequest, TQueryResponse>
  ): void;

  cancelQuery<
    TQuery extends QueryRequest = KnownQueryDefinitions[keyof KnownQueryDefinitions]
  >(
    queryName: TQuery['queryName']
  ): void;
  cancelQuery<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['req']['queryName']
  ): void;

  disconnect(): void;

  interceptors: InterceptorManagerContract<
    QueryRequest<
      string,
      unknown,
      MergedPartialOptions<QueryRequest, KnownQueryDefinitions>
    >
  >;
}
