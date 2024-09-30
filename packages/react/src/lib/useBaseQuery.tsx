/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { KumikoClient, QuerySubject } from '@kumiko/core';
import type { QueryProcessor } from '@kumiko/core/types';
import type { ExtendedQuery } from './types/query';

export function useBaseQuery<TRequest extends ExtendedQuery>(
  client: KumikoClient<any, any>,
  query: TRequest['req'],
  handler?: QueryProcessor<TRequest>
) {
  const { runOnMount = true } = query.options || {}; // Default is to run on mount

  const [subject] = useState(
    () => new QuerySubject<TRequest>(query, client, handler)
  );

  useEffect(() => {
    if (runOnMount) {
      subject.execute(query);
    }
  }, [runOnMount, query]);

  const result = useSyncExternalStore(
    useCallback((onStateChange) => subject.subscribe(onStateChange), [subject]),
    () => subject.state,
    () => subject.state
  );

  const execute = useCallback(
    (payload?: TRequest['req']['payload']) => {
      subject.execute({
        payload,
        ...query,
      });
    },
    [subject]
  );

  return [result, execute] as const;
}
