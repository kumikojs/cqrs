import { KumikoClient } from '@kumiko/core';
import { useBaseQuery } from './useBaseQuery';

import type {
  ExtractQueries,
  Feature,
  FeatureToSchema,
  GetQueryByName,
  MergedFeatureSchema,
  InferQueryInput,
  QueryHandler,
} from '@kumiko/core/types';

import type { ExtendedQuery, OptionalQueryOptions } from './types/query';

export function useQuery<FeatureList extends Feature[] = Feature[]>(
  client: KumikoClient<FeatureList>
) {
  type FeatureSchemaList = FeatureToSchema<FeatureList[number]>[];
  type KnownQueries = ExtractQueries<MergedFeatureSchema<FeatureSchemaList>>;

  function useQuery<
    QueryName extends keyof KnownQueries & string,
    QueryType extends ExtendedQuery = GetQueryByName<KnownQueries, QueryName>
  >(
    query: {
      queryName: QueryName;
      payload?: QueryType['req']['payload'];
      options?: InferQueryInput<QueryType, KnownQueries>['options'];
    } & OptionalQueryOptions,
    handler?: QueryHandler<QueryType>
  ): ReturnType<typeof useBaseQuery<QueryType, FeatureList>>;
  function useQuery<
    QueryType extends ExtendedQuery = KnownQueries[keyof KnownQueries]
  >(
    query: InferQueryInput<QueryType, KnownQueries> & OptionalQueryOptions,
    handler?: QueryHandler<QueryType>
  ): ReturnType<typeof useBaseQuery<QueryType, FeatureList>>;

  function useQuery<QueryType extends ExtendedQuery>(
    query: QueryType['req'],
    handler?: QueryHandler<QueryType>
  ) {
    return useBaseQuery(client, query, handler);
  }

  return useQuery;
}
