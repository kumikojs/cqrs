/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState, useSyncExternalStore } from 'react';

import { Aesop, QuerySubject } from '@aesop/core';
import type { Query, QueryHandlerOrFunction } from '@aesop/core/types';

export function useBaseQuery<TRequest extends Query, TResponse>(
  client: Aesop<any>,
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
