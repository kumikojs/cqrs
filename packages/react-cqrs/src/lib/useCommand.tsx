import {
  CommandSubject,
  type ClientContract,
  type CommandContract,
} from '@stoik/cqrs-core';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { useClient } from './ClientProvider';

function useBaseCommand<TResponse = void>(
  client: ClientContract,
  command: CommandContract
) {
  const [subject] = useState(() => new CommandSubject<TResponse>());

  const result = useSyncExternalStore(
    useCallback((onStateChange) => subject.subscribe(onStateChange), [subject]),
    () => subject.state,
    () => subject.state
  );

  const execute = useCallback(
    (payload?: Pick<CommandContract, 'payload'>) => {
      subject.execute(
        {
          ...command,
          ...payload,
        },
        client.command.dispatch
      );
    },
    [subject]
  );

  return [result, execute] as const;
}

export function useCommand<TRequest extends CommandContract, TResponse = void>(
  commandName: TRequest['commandName'],
  options?: Pick<TRequest, 'options' | 'context'>
) {
  const client = useClient();

  return useBaseCommand<TResponse>(client, {
    commandName,
    ...options,
  });
}
