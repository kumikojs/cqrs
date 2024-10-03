import type { DurationUnit } from '../helpers';
import type {
  AsyncStorageDriver,
  InterceptorManagerContract,
  SyncStorageDriver,
} from '../main';
import type { MergedPartialOptions, OptionsContainer } from './options/options';
import type { ResilienceOptions } from './options/resilience_options';

export interface QueryInput<
  Name extends string = string,
  Payload = unknown,
  Options extends Record<string, unknown> = Record<string, unknown>
> extends OptionsContainer<Options> {
  queryName: Name;
  payload?: Payload;
  context?: QueryContext;
}

export type QueryResult<ResponseType = unknown> = ResponseType;

export type Query<
  ReqType extends QueryInput = QueryInput,
  ResType extends QueryResult = QueryResult
> = {
  req: ReqType;
  res: ResType;
};

export type QueryExecutionOptions<QueryType extends Query> = Partial<
  Omit<ResilienceOptions, 'fallback'>
> & {
  fallback?: (
    req: QueryType['req'],
    error: unknown
  ) => QueryResult<QueryType['res']>;
};

export type PreparedQuery<
  QueryType extends Query,
  KnownQueries extends QueryRegistry
> = QueryType extends Query<
  QueryInput<infer Name, infer Payload, infer Options>
>
  ? Name extends keyof KnownQueries
    ? Query<
        QueryInput<
          Name,
          Payload,
          Options & QueryExecutionOptions<ExtractQuery<KnownQueries, Name>>
        >,
        GetQueryResult<Name, KnownQueries>
      >
    : Query<
        QueryInput<
          QueryType['req']['queryName'],
          QueryType['req']['payload'],
          QueryType['req']['options'] & QueryExecutionOptions<QueryType>
        >,
        QueryType['res']
      >
  : never;

export type PreparedQueryInput<
  QueryType extends Query,
  KnownQueries extends QueryRegistry
> = QueryType extends Query<
  QueryInput<infer Name, infer Payload, infer Options>
>
  ? Name extends keyof KnownQueries
    ? QueryInput<
        Name,
        Payload,
        Options & QueryExecutionOptions<ExtractQuery<KnownQueries, Name>>
      >
    : QueryInput<
        QueryType['req']['queryName'],
        QueryType['req']['payload'],
        QueryType['req']['options'] & QueryExecutionOptions<QueryType>
      >
  : never;

/**
 * Represents a query handler definition.
 */
export interface QueryProcessor<QueryType extends Query> {
  execute(query: QueryType['req']): Promise<QueryType['res']>;
}

/**
 * Function type representing a query handler.
 */
export type QueryProcessorFunction<QueryType extends Query = Query> =
  QueryProcessor<QueryType>['execute'];

/**
 * Type representing either a query handler or a query handler function.
 */
export type QueryHandler<QueryType extends Query = Query> =
  | QueryProcessor<QueryType>
  | QueryProcessorFunction<QueryType>;

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
export type GetQueryInput<
  QueryName extends string,
  Queries extends QueryRegistry = QueryRegistry
> = Extract<Queries[keyof Queries], { req: QueryInput<QueryName> }>['req'];

/**
 * Extracts the response type for a specific query name.
 */
export type GetQueryResult<
  QueryName extends string,
  Queries extends QueryRegistry = QueryRegistry
> = Extract<Queries[keyof Queries], { req: QueryInput<QueryName> }>['res'];

/**
 * Represents a registry of queries.
 */
export interface QueryRegistry {
  [key: string]: Query;
}

/**
 * Extracts the query definitions for a list of queries.
 */
export type ExtractQueryDefinitions<Queries extends QueryRegistry> = {
  [Key in keyof Queries]: Queries[Key] extends { req: infer QueryType }
    ? QueryType extends QueryInput<infer Name, infer Payload, infer Options>
      ? QueryInput<Name, Payload, Options>
      : never
    : never;
};

export type ResolvedQueryRegistry<
  KnownQueries extends QueryRegistry,
  KnownDependencies extends QueryRegistry = KnownQueries
> = {
  [QueryName in KnownQueries[keyof KnownQueries]['req']['queryName']]: Query<
    GetQueryInput<QueryName, KnownQueries>,
    GetQueryResult<QueryName, KnownDependencies>
  >;
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

export type ExtractQuery<Queries, QueryName> = QueryName extends keyof Queries
  ? Queries[QueryName]
  : never;

export interface QueryBusContract<
  KnownQueries extends QueryRegistry = QueryRegistry,
  KnownQueryDefinitions extends Record<
    string,
    QueryInput
  > = ExtractQueryDefinitions<KnownQueries>
> {
  execute<
    TQueryInput extends PreparedQueryInput<
      KnownQueries[keyof KnownQueries],
      KnownQueries
    >
  >(
    query: TQueryInput,
    handler: QueryHandler<ExtractQuery<KnownQueries, TQueryInput['queryName']>>
  ): Promise<GetQueryResult<TQueryInput['queryName'], KnownQueries>>;
  execute<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    query: PreparedQuery<TQuery, KnownQueries>['req'],
    handler: QueryHandler<TQuery>
  ): Promise<TQuery['res']>;

  dispatch<
    TQueryInput extends PreparedQueryInput<
      KnownQueries[keyof KnownQueries],
      KnownQueries
    >
  >(
    query: TQueryInput
  ): Promise<GetQueryResult<TQueryInput['queryName'], KnownQueries>>;
  dispatch<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    query: PreparedQuery<TQuery, KnownQueries>['req']
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
    handler: QueryHandler<TQuery>
  ): VoidFunction;

  /*
   * Infers queryName from the query request.
   * Useful when queryName is not known and request/response types need to be specified.
   */
  register<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['req']['queryName'],
    handler: QueryHandler<TQuery>
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
    handler: QueryHandler<TQuery>
  ): void;

  /*
   * Infers queryName from the query request.
   * Useful when queryName is not known and request/response types need to be specified.
   */
  unregister<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['req']['queryName'],
    handler: QueryHandler<TQuery>
  ): void;

  cancelQuery<
    TQuery extends QueryInput = KnownQueryDefinitions[keyof KnownQueryDefinitions]
  >(
    queryName: TQuery['queryName']
  ): void;
  cancelQuery<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    queryName: TQuery['req']['queryName']
  ): void;

  disconnect(): void;

  interceptors: InterceptorManagerContract<
    QueryInput<
      string,
      unknown,
      MergedPartialOptions<QueryInput, KnownQueryDefinitions>
    >
  >;
}
