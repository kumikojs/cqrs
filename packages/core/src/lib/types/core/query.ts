import type {
  AsyncStorageDriver,
  CacheOptions,
  InterceptorManagerContract,
  SyncStorageDriver,
} from '../main';
import type { MergedPartialOptions } from './options/options';
import type { ResilienceOptions } from './options/resilience_options';

export type QueryInput<
  Name extends string = string,
  Payload = unknown,
  Options extends Record<string, unknown> = Record<string, unknown>
> = {
  queryName: Name;
  payload?: Payload extends null | undefined | never ? never : Payload;
  context?: QueryContext;
  options?: Options extends null | undefined | never ? never : Options;
};

export type QueryOutput<ResponseType = unknown> = ResponseType;

export type Query<
  ReqType extends QueryInput = QueryInput,
  ResType extends QueryOutput = QueryOutput
> = {
  req: ReqType;
  res: ResType;
};

export type QueryWithOptions<QueryType extends Query> = Partial<
  Omit<ResilienceOptions, 'fallback'>
> & {
  fallback?: (
    req: QueryType['req'],
    error: unknown
  ) => QueryOutput<QueryType['res']>;
};

export type InferQuery<
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
          Options & QueryWithOptions<ExtractQuery<KnownQueries, Name>>
        >,
        GetQueryOutput<Name, KnownQueries>
      >
    : Query<
        QueryInput<
          QueryType['req']['queryName'],
          QueryType['req']['payload'],
          QueryType['req']['options'] & QueryWithOptions<QueryType>
        >,
        QueryType['res']
      >
  : never;

export type InferQueryInput<
  QueryType extends Query,
  KnownQueries extends QueryRegistry
> = QueryType extends Query<
  QueryInput<infer Name, infer Payload, infer Options>
>
  ? Name extends keyof KnownQueries
    ? QueryInput<
        Name,
        Payload,
        Options & QueryWithOptions<ExtractQuery<KnownQueries, Name>>
      >
    : QueryInput<
        QueryType['req']['queryName'],
        QueryType['req']['payload'],
        QueryType['req']['options'] & QueryWithOptions<QueryType>
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
export type GetQueryOutput<
  QueryName extends string,
  Queries extends QueryRegistry = QueryRegistry
> = Extract<Queries[keyof Queries], { req: QueryInput<QueryName> }>['res'];

export type GetQueryByName<
  Queries extends QueryRegistry,
  Name extends string
> = {
  [Key in keyof Queries]: Queries[Key]['req']['queryName'] extends Name
    ? Queries[Key]
    : never;
}[keyof Queries];

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
    TQueryInput extends InferQueryInput<
      KnownQueries[keyof KnownQueries],
      KnownQueries
    >
  >(
    query: TQueryInput,
    handler: QueryHandler<ExtractQuery<KnownQueries, TQueryInput['queryName']>>
  ): Promise<GetQueryOutput<TQueryInput['queryName'], KnownQueries>>;
  execute<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    query: InferQuery<TQuery, KnownQueries>['req'],
    handler: QueryHandler<TQuery>
  ): Promise<TQuery['res']>;

  dispatch<
    TQueryInput extends InferQueryInput<
      KnownQueries[keyof KnownQueries],
      KnownQueries
    >
  >(
    query: TQueryInput
  ): Promise<GetQueryOutput<TQueryInput['queryName'], KnownQueries>>;
  dispatch<TQuery extends Query = KnownQueries[keyof KnownQueries]>(
    query: InferQuery<TQuery, KnownQueries>['req']
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
