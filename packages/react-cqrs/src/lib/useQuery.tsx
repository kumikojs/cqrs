import {
  QuerySubject,
  type ClientContract,
  type QueryContract,
  type QueryHandlerContract,
  type QueryHandlerFn,
} from '@stoik/cqrs-core';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { useClient } from './ClientProvider';

function useBaseQuery<TRequest extends QueryContract, TResponse>(
  client: ClientContract,
  query: TRequest,
  handler?: QueryHandlerFn<TRequest, TResponse>
) {
  const [subject] = useState(() => new QuerySubject<TResponse>());

  const result = useSyncExternalStore(
    useCallback((onStateChange) => subject.subscribe(onStateChange), [subject]),
    () => subject.state,
    () => subject.state
  );

  const execute = useCallback(
    (payload?: Pick<QueryContract, 'payload'>) => {
      subject.execute(
        {
          ...query,
          ...payload,
        },
        (query) => client.query.dispatch<TRequest, TResponse>(query, handler)
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
