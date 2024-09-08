/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState, useSyncExternalStore } from 'react';

import { KumikoClient, QuerySubject } from '@kumiko/core';
import type { QueryRequest, QueryHandlerOrFunction } from '@kumiko/core/types';

export function useBaseQuery<TRequest extends QueryRequest, TResponse>(
  client: KumikoClient,
  query: TRequest,
  handler?: QueryHandlerOrFunction<TRequest, TResponse>
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
