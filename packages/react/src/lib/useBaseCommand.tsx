/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useState, useSyncExternalStore } from 'react';

import { CommandSubject, KumikoClient } from '@kumiko/core';
import type {
  Command,
  CommandExecutorFunction,
  Feature,
} from '@kumiko/core/types';

export function useBaseCommand<
  TRequest extends Command,
  FeatureList extends Feature[] = Feature[]
>(
  client: KumikoClient<FeatureList>,
  command: TRequest,
  handler?: CommandExecutorFunction
) {
  const [subject] = useState(() => new CommandSubject(client, handler));

  const result = useSyncExternalStore(
    useCallback((onStateChange) => subject.subscribe(onStateChange), [subject]),
    () => subject.state,
    () => subject.state
  );

  const execute = useCallback(
    (payload?: TRequest['payload']) => {
      subject.execute({
        ...command,
        payload,
      });
    },
    [subject, command]
  );

  return [result, execute] as const;
}
