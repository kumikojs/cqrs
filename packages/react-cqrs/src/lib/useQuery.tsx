import { useCallback, useState, useSyncExternalStore } from 'react';
import type { QueryContract } from '@stoik/cqrs-core';
import { QuerySubject } from '@stoik/cqrs-core';
import { useClient } from './ClientProvider';

export function useQuery<TResponse>(query: QueryContract) {
  const client = useClient();
  const [subject] = useState(() => new QuerySubject<TResponse>());

  const state = useSyncExternalStore(
    useCallback(
      (onStateChange) => {
        const unsubscribe = subject.subscribe(onStateChange);

        return () => {
          unsubscribe();
        };
      },
      [subject]
    ),
    () => subject.state,
    () => subject.state
  );

  const execute = useCallback(() => {
    subject.execute(query, client.query.dispatch);
  }, [subject]);

  return [state, execute] as const;
}
