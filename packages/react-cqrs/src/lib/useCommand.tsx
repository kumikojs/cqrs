import { useCallback, useState, useSyncExternalStore } from 'react';

import { CommandSubject } from '@stoik/cqrs-core';
import { useClient } from './ClientProvider';

import type {
  ClientContract,
  CommandContract,
  CommandHandlerContract,
} from '@stoik/cqrs-core';

export function useBaseCommand<TRequest extends CommandContract, TResponse>(
  client: ClientContract,
  command: TRequest,
  handler?: CommandHandlerContract<TRequest, TResponse>['execute']
) {
  const [subject] = useState(() => new CommandSubject<TResponse>());

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
          ...command,
        },
        (command) =>
          client.command.dispatch<TRequest, TResponse>(command, handler)
      );
    },
    [subject]
  );

  return [result, execute] as const;
}

export function useCommand<TRequest extends CommandContract, TResponse = void>(
  command: TRequest,
  handler?: CommandHandlerContract<TRequest, TResponse>['execute']
) {
  const client = useClient();

  return useBaseCommand<TRequest, TResponse>(client, command, handler);
}
