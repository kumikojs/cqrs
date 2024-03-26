import { useCallback, useState, useSyncExternalStore } from 'react';

import {
  QuerySubject,
  type ClientContract,
  type QueryContract,
  type QueryHandlerContract,
} from '@stoik/cqrs-core';

export function useBaseQuery<TRequest extends QueryContract, TResponse>(
  client: ClientContract,
  query: TRequest,
  handler?: QueryHandlerContract<TRequest, TResponse>['execute']
) {
  const [subject] = useState(
    () => new QuerySubject<TResponse>(query.queryName, client)
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
        (query) => (handler ? handler(query) : client.query.dispatch(query))
      );
    },
    [subject]
  );

  return [result, execute] as const;
}
