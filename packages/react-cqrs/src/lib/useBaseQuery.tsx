import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { Client, QuerySubject } from '@stoik/cqrs-core';

import type { QueryContract, QueryHandlerContract } from '@stoik/cqrs-core';

export function useBaseQuery<TRequest extends QueryContract, TResponse>(
  client: Client,
  query: TRequest,
  handler?: QueryHandlerContract<TRequest, TResponse>['execute']
) {
  const [subject] = useState(
    () => new QuerySubject<TRequest, TResponse>(query, client, handler)
  );

  const result = useSyncExternalStore(
    useCallback((onStateChange) => subject.subscribe(onStateChange), [subject]),
    () => subject.state,
    () => subject.state
  );

  const execute = useCallback(
    (payload?: TRequest['payload']) => {
      subject.execute({
        payload,
        ...query,
      });
    },
    [subject]
  );

  return [result, execute] as const;
}
