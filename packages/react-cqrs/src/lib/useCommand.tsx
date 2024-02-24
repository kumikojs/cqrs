import { CommandContract, CommandSubject } from '@stoik/cqrs-core';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { useClient } from './ClientProvider';

export function useCommand<TResponse = void>(command: CommandContract) {
  const client = useClient();
  const [subject] = useState(() => new CommandSubject<TResponse>());

  const result = useSyncExternalStore(
    useCallback((onStateChange) => subject.subscribe(onStateChange), [subject]),
    () => subject.state,
    () => subject.state
  );

  const execute = useCallback(
    (payload: Pick<CommandContract, 'payload'>) => {
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
