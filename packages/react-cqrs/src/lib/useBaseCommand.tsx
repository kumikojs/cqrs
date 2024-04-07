import { useCallback, useState, useSyncExternalStore } from 'react';

import { CommandSubject, Client } from '@stoik/cqrs-core';

import type { CommandContract, CommandHandlerContract } from '@stoik/cqrs-core';

export function useBaseCommand<TRequest extends CommandContract>(
  client: Client,
  command: TRequest,
  handler?: CommandHandlerContract<TRequest>['execute']
) {
  const [subject] = useState(() => new CommandSubject());

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
          handler
            ? client.command.execute(command, (command) => handler(command))
            : client.command.dispatch(command)
      );
    },
    [subject]
  );

  return [result, execute] as const;
}
