import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { useClient } from './ClientProvider';

import type {
  ClientContract,
  QueryContract,
  QueryHandlerContract,
} from '@stoik/cqrs-core';

export function useBaseQuery<TRequest extends QueryContract, TResponse>(
  client: ClientContract,
  query: TRequest,
  handler?: QueryHandlerContract<TRequest, TResponse>['execute']
) {
  const [subject] = useState(() =>
    client.query.manager.getOrSet<TResponse>(query.queryName)
  );

  const result = useSyncExternalStore(
    useCallback((onStateChange) => subject.subscribe(onStateChange), [subject]),
    () => subject.state,
    () => subject.state
  );

  const execute = useCallback(
    (payload?: TRequest['payload']) => {
      subject.execute(
        {
          payload,
          ...query,
        },
        (query) => client.query.dispatch(query, handler)
      );
    },
    [subject]
  );

  return [result, execute] as const;
}

export function useQuery<TRequest extends QueryContract, TResponse>(
  query: TRequest,
  handler?: QueryHandlerContract<TRequest, TResponse>['execute']
) {
  const client = useClient();

  return useBaseQuery<TRequest, TResponse>(client, query, handler);
}
